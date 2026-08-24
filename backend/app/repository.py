import sqlite3
from datetime import date

from .schemas import BodyWeight, Exercise, MuscleGroup


def read_workout(connection: sqlite3.Connection, workout_id: str) -> list[MuscleGroup]:
    group_rows = connection.execute(
        "SELECT id, name FROM muscle_groups WHERE workout_id = ? ORDER BY sort_order, id",
        (workout_id,),
    ).fetchall()
    groups: list[MuscleGroup] = []
    for group_row in group_rows:
        exercise_rows = connection.execute(
            """
            SELECT id, name, weight, sets, reps, notes, weight_increment
            FROM exercises WHERE muscle_group_id = ? ORDER BY sort_order, id
            """,
            (group_row["id"],),
        ).fetchall()
        groups.append(
            MuscleGroup(
                id=group_row["id"],
                name=group_row["name"],
                exercises=[Exercise(**dict(row)) for row in exercise_rows],
            )
        )
    return groups


def replace_workout(connection: sqlite3.Connection, workout_id: str, groups: list[MuscleGroup]) -> None:
    connection.execute("DELETE FROM muscle_groups WHERE workout_id = ?", (workout_id,))
    for group_order, group in enumerate(groups):
        connection.execute(
            "INSERT INTO muscle_groups (id, workout_id, name, sort_order) VALUES (?, ?, ?, ?)",
            (group.id, workout_id, group.name, group_order),
        )
        connection.executemany(
            """
            INSERT INTO exercises
                (id, muscle_group_id, name, weight, sets, reps, notes, weight_increment, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    exercise.id, group.id, exercise.name, exercise.weight,
                    exercise.sets, exercise.reps, exercise.notes,
                    exercise.weight_increment, exercise_order,
                )
                for exercise_order, exercise in enumerate(group.exercises)
            ],
        )


def read_weights(connection: sqlite3.Connection) -> list[BodyWeight]:
    rows = connection.execute(
        "SELECT measured_date AS date, value FROM body_weights ORDER BY measured_date"
    ).fetchall()
    return [BodyWeight(date=date.fromisoformat(row["date"]), value=row["value"]) for row in rows]


def upsert_weight(connection: sqlite3.Connection, measured_date: date, value: float) -> BodyWeight:
    connection.execute(
        """
        INSERT INTO body_weights (measured_date, value) VALUES (?, ?)
        ON CONFLICT(measured_date) DO UPDATE SET value = excluded.value
        """,
        (measured_date.isoformat(), value),
    )
    return BodyWeight(date=measured_date, value=value)


def delete_weight(connection: sqlite3.Connection, measured_date: date) -> bool:
    cursor = connection.execute(
        "DELETE FROM body_weights WHERE measured_date = ?",
        (measured_date.isoformat(),),
    )
    return cursor.rowcount > 0


def read_workout_days(connection: sqlite3.Connection) -> list[date]:
    rows = connection.execute(
        "SELECT workout_date FROM workout_days ORDER BY workout_date"
    ).fetchall()
    return [date.fromisoformat(row["workout_date"]) for row in rows]


def add_workout_day(connection: sqlite3.Connection, workout_date: date) -> date:
    connection.execute(
        "INSERT OR IGNORE INTO workout_days (workout_date) VALUES (?)",
        (workout_date.isoformat(),),
    )
    return workout_date


def delete_workout_day(connection: sqlite3.Connection, workout_date: date) -> bool:
    cursor = connection.execute(
        "DELETE FROM workout_days WHERE workout_date = ?",
        (workout_date.isoformat(),),
    )
    return cursor.rowcount > 0
