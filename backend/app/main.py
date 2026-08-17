from contextlib import asynccontextmanager
from datetime import date
import sqlite3
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import get_connection, initialize_database
from .repository import delete_weight, read_weights, read_workout, replace_workout, upsert_weight
from .schemas import BodyWeight, BodyWeightCreate, GymState, MuscleGroup, WorkoutUpdate

API_PREFIX = "/gym/api"


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Pi Gym API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(f"{API_PREFIX}/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(f"{API_PREFIX}/state", response_model=GymState)
def get_state() -> GymState:
    with get_connection() as connection:
        return GymState(
            workouts={"A": read_workout(connection, "A"), "B": read_workout(connection, "B")},
            weights=read_weights(connection),
        )


@app.put(f"{API_PREFIX}/workouts/{{workout_id}}", response_model=list[MuscleGroup])
def update_workout(workout_id: Literal["A", "B"], payload: WorkoutUpdate) -> list[MuscleGroup]:
    group_ids = [group.id for group in payload.groups]
    exercise_ids = [exercise.id for group in payload.groups for exercise in group.exercises]
    if len(group_ids) != len(set(group_ids)) or len(exercise_ids) != len(set(exercise_ids)):
        raise HTTPException(status_code=400, detail="Group and exercise IDs must be unique")
    try:
        with get_connection() as connection:
            replace_workout(connection, workout_id, payload.groups)
            return read_workout(connection, workout_id)
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="An ID is already used by the other workout") from error


@app.post(f"{API_PREFIX}/weights", response_model=BodyWeight)
def save_weight(payload: BodyWeightCreate) -> BodyWeight:
    with get_connection() as connection:
        return upsert_weight(connection, payload.measured_date or date.today(), payload.value)


@app.delete(f"{API_PREFIX}/weights/{{measured_date}}", status_code=204)
def remove_weight(measured_date: date) -> None:
    with get_connection() as connection:
        if not delete_weight(connection, measured_date):
            raise HTTPException(status_code=404, detail="Weight measurement not found")
