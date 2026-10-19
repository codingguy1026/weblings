"""Weblings Discord bot, using slash commands only (discord.py 2.x)."""
import logging
import os

import discord
from discord import app_commands

from weblings.core import SPECIES, WeblingsStore, meter, stage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
TOKEN = os.environ.get("DISCORD_TOKEN")
if not TOKEN:
    raise SystemExit("DISCORD_TOKEN 환경변수를 설정해 주세요. .env.example 참고")

store = WeblingsStore(os.environ.get("DATABASE_PATH", "data/weblings.db"))


class WeblingsClient(discord.Client):
    def __init__(self) -> None:
        super().__init__(intents=discord.Intents(guilds=True))
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self) -> None:
        test_guild = os.environ.get("TEST_GUILD_ID")
        if test_guild:
            guild = discord.Object(id=int(test_guild))
            self.tree.copy_global_to(guild=guild)
            commands = await self.tree.sync(guild=guild)
            logging.info("테스트 서버 명령어 %d개 동기화 완료", len(commands))
        else:
            commands = await self.tree.sync()
            logging.info("글로벌 명령어 %d개 동기화 요청 (전파에 시간이 걸릴 수 있음)", len(commands))


client = WeblingsClient()
webling = app_commands.Group(name="webling", description="우리 서버의 생물을 함께 키워요! 🥚")


def clean(text: str) -> str:
    return discord.utils.escape_mentions(discord.utils.escape_markdown(text))


def embed_for(state: dict) -> discord.Embed:
    emoji, species_name = SPECIES[state["species"]]
    current, next_xp = stage(state["xp"])
    embed = discord.Embed(
        title=f"{emoji} {clean(state['name'])}",
        description=f"**{species_name}** · 성장 단계: **{current}**",
        color=discord.Color.from_rgb(133, 188, 158),
    )
    embed.add_field(name="🍓 배부름", value=meter(state["hunger"]), inline=False)
    embed.add_field(name="💛 기분", value=meter(state["mood"]), inline=False)
    embed.add_field(name="💤 에너지", value=meter(state["energy"]), inline=False)
    embed.add_field(
        name="✨ 경험치",
        value=f"{state['xp']} XP" + (f" / 다음 성장 {next_xp} XP" if next_xp else " · 최고 단계!"),
        inline=False,
    )
    embed.set_footer(text="모두가 함께 키우는 서버의 단 하나뿐인 웹링 🌎")
    return embed


async def guild_id_or_reply(interaction: discord.Interaction) -> int | None:
    if interaction.guild_id is None:
        await interaction.response.send_message("🏠 웹링은 Discord 서버 안에서만 키울 수 있어!", ephemeral=True)
        return None
    return interaction.guild_id


@webling.command(name="adopt", description="우리 서버에 웹링 한 마리를 데려와요")
@app_commands.describe(name="웹링의 이름 (2~16자)", species="웹링의 종류")
@app_commands.choices(species=[
    app_commands.Choice(name="🌿 숲", value="forest"),
    app_commands.Choice(name="☁️ 구름", value="cloud"),
    app_commands.Choice(name="⚡ 번개", value="spark"),
    app_commands.Choice(name="🐚 바다", value="ocean"),
])
async def adopt(interaction: discord.Interaction, name: str, species: app_commands.Choice[str]) -> None:
    gid = await guild_id_or_reply(interaction)
    if gid is None:
        return
    try:
        created = store.adopt(gid, name, species.value)
    except ValueError:
        await interaction.response.send_message("이름은 줄바꿈 없이 2~16자로 지어 줘!", ephemeral=True)
        return
    if not created:
        await interaction.response.send_message(
            "이미 이 서버에 웹링이 살고 있어! `/webling status`로 만나 봐 👀", ephemeral=True
        )
        return
    await interaction.response.send_message(
        "🎉 **우리 서버의 첫 웹링이 태어났어!**", embed=embed_for(store.get(gid))
    )


@webling.command(name="status", description="우리 웹링의 성장과 상태를 확인해요")
async def status(interaction: discord.Interaction) -> None:
    gid = await guild_id_or_reply(interaction)
    if gid is None:
        return
    state = store.get(gid)
    if state is None:
        await interaction.response.send_message("🥚 아직 웹링이 없어! `/webling adopt`로 첫 웹링을 만나자.")
        return
    await interaction.response.send_message(embed=embed_for(state))


async def do_action(interaction: discord.Interaction, action: str, text: str) -> None:
    gid = await guild_id_or_reply(interaction)
    if gid is None:
        return
    outcome = store.act(gid, interaction.user.id, action)
    if not outcome["ok"]:
        if outcome["reason"] == "missing":
            msg = "🥚 아직 웹링이 없어! `/webling adopt`로 먼저 데려오자."
        else:
            sec = outcome["remaining"]
            msg = f"⏳ 조금만 쉬어 가자! **{(sec + 59) // 60}분** 뒤 다시 할 수 있어."
        await interaction.response.send_message(msg, ephemeral=True)
        return
    state = outcome["state"]
    msg = f"{interaction.user.mention} {text} **+{outcome['xp_gained']} XP**"
    if outcome["level_up"]:
        msg += f"\n🎊 **성장했어! 이제 {stage(state['xp'])[0]} 단계야!**"
    await interaction.response.send_message(
        msg, embed=embed_for(state), allowed_mentions=discord.AllowedMentions.none()
    )


@webling.command(name="feed", description="웹링에게 먹이를 줘요 (20분 간격)")
async def feed(interaction: discord.Interaction) -> None:
    await do_action(interaction, "feed", "웹링에게 맛있는 간식을 줬어! 🍓")


@webling.command(name="play", description="웹링과 놀아요 (25분 간격)")
async def play(interaction: discord.Interaction) -> None:
    await do_action(interaction, "play", "웹링과 신나게 놀았어! 🎾")


@webling.command(name="pet", description="웹링을 쓰다듬어요 (10분 간격)")
async def pet(interaction: discord.Interaction) -> None:
    await do_action(interaction, "pet", "웹링을 쓰다듬어 줬어! 💕")


@webling.command(name="rename", description="서버 관리자가 웹링 이름을 변경해요")
@app_commands.describe(name="새 웹링 이름 (2~16자)")
async def rename(interaction: discord.Interaction, name: str) -> None:
    gid = await guild_id_or_reply(interaction)
    if gid is None:
        return
    if not isinstance(interaction.user, discord.Member) or not interaction.user.guild_permissions.manage_guild:
        await interaction.response.send_message(
            "🔒 서버 관리 권한이 있는 사람만 이름을 바꿀 수 있어.", ephemeral=True
        )
        return
    try:
        changed = store.rename(gid, name)
    except ValueError:
        await interaction.response.send_message("이름은 줄바꿈 없이 2~16자로 지어 줘!", ephemeral=True)
        return
    if not changed:
        await interaction.response.send_message(
            "아직 웹링이 없어! `/webling adopt`로 먼저 데려오자.", ephemeral=True
        )
        return
    await interaction.response.send_message(f"📝 우리 웹링의 새 이름은 **{clean(name.strip())}**!")


@webling.command(name="contributors", description="웹링 성장에 함께한 서버 구성원들을 봐요")
async def contributors(interaction: discord.Interaction) -> None:
    gid = await guild_id_or_reply(interaction)
    if gid is None:
        return
    leaders = store.leaderboard(gid)
    if not leaders:
        await interaction.response.send_message("🌱 첫 번째 돌봄을 기다리는 중이야!")
        return
    lines = [
        f"**{idx}.** <@{item['user_id']}> · {item['xp']} XP · {item['actions']}번 돌봄"
        for idx, item in enumerate(leaders, 1)
    ]
    await interaction.response.send_message(
        "🏅 **우리 웹링의 돌봄 기록**\n" + "\n".join(lines),
        allowed_mentions=discord.AllowedMentions.none(),
    )


@webling.command(name="help", description="웹링 명령어 사용법을 확인해요")
async def help_command(interaction: discord.Interaction) -> None:
    await interaction.response.send_message(
        "🌏 **Weblings 사용법**\n"
        "`/webling adopt` 웹링 탄생 · `/webling status` 상태 확인\n"
        "`/webling feed` 먹이 · `/webling play` 놀기 · `/webling pet` 쓰다듬기\n"
        "`/webling contributors` 함께 키운 사람들 · `/webling rename` 이름 변경(관리자)\n"
        "서버마다 웹링은 **한 마리**! 각 유저의 돌봄 대기시간은 따로 적용돼.\n"
        "오래 쉬어도 웹링이 사라지지는 않아. 🌿",
        ephemeral=True,
    )


client.tree.add_command(webling)

if __name__ == "__main__":
    client.run(TOKEN)
