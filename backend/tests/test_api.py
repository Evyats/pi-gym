import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


class GymApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        os.environ["GYM_DATABASE_PATH"] = str(Path(self.temp_dir.name) / "gym.db")
        self.client_context = TestClient(app)
        self.client = self.client_context.__enter__()

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)
        os.environ.pop("GYM_DATABASE_PATH", None)
        self.temp_dir.cleanup()

    def test_initial_state_is_seeded(self) -> None:
        response = self.client.get("/gym/api/state")
        self.assertEqual(response.status_code, 200)
        state = response.json()
        self.assertEqual([group["name"] for group in state["workouts"]["A"]], ["Chest", "Shoulders", "Triceps"])
        self.assertGreater(len(state["weights"]), 0)

    def test_replacing_workout_preserves_submitted_order(self) -> None:
        state = self.client.get("/gym/api/state").json()
        reversed_groups = list(reversed(state["workouts"]["A"]))
        reversed_groups[0]["exercises"] = list(reversed(reversed_groups[0]["exercises"]))
        response = self.client.put("/gym/api/workouts/A", json={"groups": reversed_groups})
        self.assertEqual(response.status_code, 200)
        saved = self.client.get("/gym/api/state").json()["workouts"]["A"]
        self.assertEqual([group["id"] for group in saved], [group["id"] for group in reversed_groups])
        self.assertEqual([item["id"] for item in saved[0]["exercises"]], [item["id"] for item in reversed_groups[0]["exercises"]])

    def test_weight_is_upserted_for_a_day(self) -> None:
        first = self.client.post("/gym/api/weights", json={"value": 77.4, "measured_date": "2026-08-16"})
        second = self.client.post("/gym/api/weights", json={"value": 77.1, "measured_date": "2026-08-16"})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        matches = [item for item in self.client.get("/gym/api/state").json()["weights"] if item["date"] == "2026-08-16"]
        self.assertEqual(matches, [{"date": "2026-08-16", "value": 77.1}])


if __name__ == "__main__":
    unittest.main()
