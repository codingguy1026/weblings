import unittest

from weblings.core import WeblingsStore, meter, stage


class WeblingsTests(unittest.TestCase):
    def setUp(self):
        self.store = WeblingsStore(":memory:")

    def tearDown(self):
        self.store.close()

    def test_one_creature_per_server(self):
        self.assertTrue(self.store.adopt(1, "모찌", "forest", now=10000))
        self.assertFalse(self.store.adopt(1, "두부", "ocean", now=10000))
        self.assertTrue(self.store.adopt(2, "두부", "ocean", now=10000))
        self.assertEqual(self.store.get(1, now=10000)["name"], "모찌")
        self.assertEqual(self.store.get(2, now=10000)["name"], "두부")

    def test_per_user_cooldowns(self):
        self.store.adopt(1, "모찌", "forest", now=10000)
        self.assertTrue(self.store.act(1, 101, "feed", now=10000)["ok"])
        blocked = self.store.act(1, 101, "feed", now=10001)
        self.assertEqual(blocked["reason"], "cooldown")
        self.assertEqual(blocked["remaining"], 1199)
        self.assertTrue(self.store.act(1, 102, "feed", now=10001)["ok"])
        self.assertTrue(self.store.act(1, 101, "pet", now=10001)["ok"])
        self.assertTrue(self.store.act(1, 101, "feed", now=11200)["ok"])

    def test_growth_and_contributors(self):
        self.store.adopt(1, "모찌", "forest", now=10000)
        for n in range(9):
            self.store.act(1, n, "feed", now=10000)
        self.assertEqual(stage(self.store.get(1, now=10000)["xp"])[0], "어린이")
        self.assertEqual(len(self.store.leaderboard(1)), 9)
        self.assertEqual(self.store.get(1, now=10000)["xp"], 126)

    def test_offline_decay_without_death(self):
        self.store.adopt(1, "모찌", "forest", now=10000)
        creature = self.store.get(1, now=10000 + 1000 * 3600)
        self.assertEqual(creature["hunger"], 0)
        self.assertEqual(creature["mood"], 0)
        self.assertEqual(creature["energy"], 100)
        self.assertEqual(self.store.get(1, now=10000 + 1000 * 3600)["name"], "모찌")

    def test_validation_and_meter(self):
        with self.assertRaises(ValueError):
            self.store.adopt(1, "A", "forest", now=10000)
        self.assertEqual(meter(100).count("▰"), 10)
        self.assertIsNone(stage(1600)[1])


if __name__ == "__main__":
    unittest.main()
