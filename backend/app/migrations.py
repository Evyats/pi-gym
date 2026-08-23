import sqlite3
from datetime import date, timedelta


SEED_WORKOUTS = {
    "A": [
        ("chest", "Chest", [("bench", "Bench press", 70, 4, 8, "Pause at the bottom"), ("incline", "Incline dumbbell press", 24, 3, 10, "30° bench")]),
        ("shoulders", "Shoulders", [("press", "Shoulder press", 20, 3, 8, "Controlled negative"), ("laterals", "Lateral raises", 8, 3, 12, "Keep tension")]),
        ("triceps", "Triceps", [("pushdown", "Cable pushdown", 25, 3, 12, "Lock elbows in place")]),
    ],
    "B": [
        ("back", "Back", [("pulldown", "Lat pulldown", 55, 4, 8, "Drive elbows down"), ("row", "Seated cable row", 50, 3, 10, "Hold the squeeze")]),
        ("legs", "Legs", [("squat", "Back squat", 80, 4, 6, "Brace before descending"), ("curl", "Leg curl", 35, 3, 12, "Slow negative")]),
        ("biceps", "Biceps", [("curl-bar", "EZ-bar curl", 25, 3, 10, "No swinging")]),
    ],
}


def migrate(connection: sqlite3.Connection) -> None:
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS workouts (
            id TEXT PRIMARY KEY CHECK (id IN ('A', 'B'))
        );

        CREATE TABLE IF NOT EXISTS muscle_groups (
            id TEXT PRIMARY KEY,
            workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            sort_order INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS exercises (
            id TEXT PRIMARY KEY,
            muscle_group_id TEXT NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            weight REAL NOT NULL DEFAULT 0,
            sets INTEGER NOT NULL,
            reps INTEGER NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS body_weights (
            measured_date TEXT PRIMARY KEY,
            value REAL NOT NULL CHECK (value > 0)
        );
        """
    )
    exercise_columns = {row[1] for row in connection.execute("PRAGMA table_info(exercises)")}
    if "weight_increment" not in exercise_columns:
        connection.execute(
            "ALTER TABLE exercises ADD COLUMN weight_increment REAL NOT NULL "
            "DEFAULT 1.25 CHECK (weight_increment IN (1, 1.25))"
        )
    if connection.execute("SELECT 1 FROM workouts LIMIT 1").fetchone() is None:
        seed_database(connection)


def seed_database(connection: sqlite3.Connection) -> None:
    for workout_id, groups in SEED_WORKOUTS.items():
        connection.execute("INSERT INTO workouts (id) VALUES (?)", (workout_id,))
        for group_order, (group_id, name, exercises) in enumerate(groups):
            connection.execute(
                "INSERT INTO muscle_groups (id, workout_id, name, sort_order) VALUES (?, ?, ?, ?)",
                (group_id, workout_id, name, group_order),
            )
            connection.executemany(
                """
                INSERT INTO exercises
                    (id, muscle_group_id, name, weight, sets, reps, notes, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (exercise[0], group_id, *exercise[1:], exercise_order)
                    for exercise_order, exercise in enumerate(exercises)
                ],
            )

    today = date.today()
    seed_weights = [(55, 80.2), (48, 79.9), (41, 79.7), (34, 79.8), (27, 79.3), (20, 79.0), (8, 78.7), (1, 78.4)]
    connection.executemany(
        "INSERT INTO body_weights (measured_date, value) VALUES (?, ?)",
        [((today - timedelta(days=days_ago)).isoformat(), value) for days_ago, value in seed_weights],
    )
