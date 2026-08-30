from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class Exercise(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    weight: float = Field(ge=0, le=500)
    sets: int = Field(ge=1, le=100)
    reps: int = Field(ge=1, le=1000)
    notes: str = Field(default="", max_length=2000)
    weight_increment: Literal[1.0, 1.25, 2.0] = 1.25


class MuscleGroup(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    exercises: list[Exercise]


class WorkoutUpdate(BaseModel):
    groups: list[MuscleGroup]


class BodyWeightCreate(BaseModel):
    value: float = Field(gt=0, le=500)
    measured_date: date | None = None


class BodyWeight(BaseModel):
    date: date
    value: float


class GymState(BaseModel):
    workouts: dict[Literal["A", "B"], list[MuscleGroup]]
    weights: list[BodyWeight]
    workout_days: list[date]
