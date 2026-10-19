"""Per-server Weblings game rules and SQLite persistence."""
from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path

SPECIES = {
    "forest": ("🌿", "숲 웹링"),
    "cloud": ("☁️", "구름 웹링"),
    "spark": ("⚡", "번개 웹링"),
    "ocean": ("🐚", "바다 웹링"),
}
STAGES = [(0, "아기"), (120, "어린이"), (350, "청소년"), (800, "어른"), (1600, "전설")]
ACTIONS = {
    "feed": {"cooldown": 20 * 60, "hunger": 25, "energy": 5, "mood": 3, "xp": 14},
    "play": {"cooldown": 25 * 60, "hunger": -8, "energy": -12, "mood": 25, "xp": 18},
    "pet": {"cooldown": 10 * 60, "hunger": 0, "energy": 2, "mood": 13, "xp": 7},
}


def stage(xp: int) -> tuple[str, int | None]:
    current, next_at = STAGES[0][1], None
    for minimum, name in STAGES:
        if xp >= minimum:
            current = name
        else:
            next_at = minimum
            break
    return current, next_at


def meter(value: int) -> str:
    filled = max(0, min(10, value // 10))
    return "▰" * filled + "▱" * (10 - filled) + f" {value}/100"


class WeblingsStore:
    """One shared creature per guild; individual action cooldowns."""

    def __init__(self, path: str = "data/weblings.db") -> None:
        self._lock = threading.RLock()
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA busy_timeout=5000")
        self.db.execute("PRAGMA journal_mode=WAL")
        with self.db:
            self.db.executescript("""
                CREATE TABLE IF NOT EXISTS creatures (
                    guild_id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    species TEXT NOT NULL,
                    xp INTEGER NOT NULL DEFAULT 0,
                    hunger INTEGER NOT NULL DEFAULT 80,
                    energy INTEGER NOT NULL DEFAULT 80,
                    mood INTEGER NOT NULL DEFAULT 80,
                    updated_at INTEGER NOT NULL,
                    created_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS action_cooldowns (
                    guild_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    action TEXT NOT NULL,
                    used_at INTEGER NOT NULL,
                    PRIMARY KEY (guild_id, user_id, action)
                );
                CREATE TABLE IF NOT EXISTS contributors (
                    guild_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    actions INTEGER NOT NULL DEFAULT 0,
                    xp INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (guild_id, user_id)
                );
            """)

    def close(self) -> None:
        self.db.close()

    def adopt(self, guild_id: int, name: str, species: str, now: int | None = None) -> bool:
        if species not in SPECIES:
            raise ValueError("Unknown species")
        name = name.strip()
        if not (2 <= len(name) <= 16) or "\n" in name or "\r" in name:
            raise ValueError("Name must be 2–16 characters on one line")
        now = int(time.time()) if now is None else now
        with self._lock, self.db:
            cursor = self.db.execute(
                "INSERT OR IGNORE INTO creatures (guild_id, name, species, updated_at, created_at) VALUES (?, ?, ?, ?, ?)",
                (guild_id, name, species, now, now),
            )
            return cursor.rowcount == 1

    def _state_locked(self, guild_id: int, now: int) -> dict | None:
        row = self.db.execute("SELECT * FROM creatures WHERE guild_id=?", (guild_id,)).fetchone()
        if row is None:
            return None
        state = dict(row)
        hours = max(0, (now - state["updated_at"]) // 3600)
        if hours:
            # No deaths or forced daily logins.
            state["hunger"] = max(0, state["hunger"] - hours * 2)
            state["mood"] = max(0, state["mood"] - hours)
            state["energy"] = min(100, state["energy"] + hours * 3)
            state["updated_at"] += hours * 3600
            self.db.execute(
                "UPDATE creatures SET hunger=?, mood=?, energy=?, updated_at=? WHERE guild_id=?",
                (state["hunger"], state["mood"], state["energy"], state["updated_at"], guild_id),
            )
        return state

    def get(self, guild_id: int, now: int | None = None) -> dict | None:
        now = int(time.time()) if now is None else now
        with self._lock, self.db:
            return self._state_locked(guild_id, now)

    def act(self, guild_id: int, user_id: int, action: str, now: int | None = None) -> dict:
        if action not in ACTIONS:
            raise ValueError("Unknown action")
        now = int(time.time()) if now is None else now
        rule = ACTIONS[action]
        with self._lock, self.db:
            state = self._state_locked(guild_id, now)
            if state is None:
                return {"ok": False, "reason": "missing"}
            last = self.db.execute(
                "SELECT used_at FROM action_cooldowns WHERE guild_id=? AND user_id=? AND action=?",
                (guild_id, user_id, action),
            ).fetchone()
            remaining = max(0, rule["cooldown"] - (now - last["used_at"])) if last else 0
            if remaining:
                return {"ok": False, "reason": "cooldown", "remaining": remaining}
            for field in ("hunger", "energy", "mood"):
                state[field] = max(0, min(100, state[field] + rule[field]))
            before = stage(state["xp"])[0]
            state["xp"] += rule["xp"]
            after = stage(state["xp"])[0]
            self.db.execute(
                "UPDATE creatures SET hunger=?, energy=?, mood=?, xp=? WHERE guild_id=?",
                (state["hunger"], state["energy"], state["mood"], state["xp"], guild_id),
            )
            self.db.execute("""
                INSERT INTO action_cooldowns (guild_id, user_id, action, used_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(guild_id, user_id, action) DO UPDATE SET used_at=excluded.used_at
            """, (guild_id, user_id, action, now))
            self.db.execute("""
                INSERT INTO contributors (guild_id, user_id, actions, xp)
                VALUES (?, ?, 1, ?)
                ON CONFLICT(guild_id, user_id) DO UPDATE SET
                    actions=actions+1, xp=xp+excluded.xp
            """, (guild_id, user_id, rule["xp"]))
            return {"ok": True, "state": state, "xp_gained": rule["xp"], "level_up": before != after}

    def rename(self, guild_id: int, name: str) -> bool:
        name = name.strip()
        if not (2 <= len(name) <= 16) or "\n" in name or "\r" in name:
            raise ValueError("Name must be 2–16 characters on one line")
        with self._lock, self.db:
            return self.db.execute(
                "UPDATE creatures SET name=? WHERE guild_id=?", (name, guild_id)
            ).rowcount > 0

    def leaderboard(self, guild_id: int, limit: int = 10) -> list[dict]:
        with self._lock:
            return [dict(r) for r in self.db.execute(
                "SELECT user_id, actions, xp FROM contributors WHERE guild_id=? ORDER BY xp DESC, actions DESC LIMIT ?",
                (guild_id, limit),
            ).fetchall()]
