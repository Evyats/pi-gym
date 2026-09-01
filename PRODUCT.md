# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Inferred from the repository and brief: one primary user operates the app on a phone during workouts and occasionally on a computer for editing and review.

## Product Purpose

Pi Gym keeps two reusable workout plans, makes exercise numbers quick to adjust, records daily body weight, and tracks completed workout days. Success means the user can operate it quickly between sets without navigating a complex fitness platform.

## Positioning

It is a private, lightweight personal training log: the interface is shaped around the user's own A/B routines and records rather than coaching, discovery, social features, or subscriptions.

## Operating Context

The app is commonly used one-handed on a phone in a gym. Exercise names and notes must remain readable at a glance; weight, sets, and reps are changed frequently. Editing workout structure is a deliberate secondary mode. Weight history and the calendar are reflective views.

## Capabilities and Constraints

- Four primary areas: Workout A, Workout B, body weight, and workout calendar.
- Exercises belong to muscle-group sections and include name, notes, weight, sets, and reps.
- Workout structure and ordering change only in edit mode; exercise numbers remain directly adjustable.
- Body weight uses dated entries and a date-proportional trend graph.
- The calendar records workout days and prevents future-date editing.
- The production frontend and backend must remain untouched during this concept exercise.
- The three alternatives are static, synthetic-data design prototypes rather than production implementations.

## Evidence on Hand

The existing implementation and mock data under `frontend/src/` are the sole product evidence. No performance claims, coaching content, or social features should be invented.

## Product Principles

- Make the next gym action obvious within one glance.
- Prefer direct manipulation over data-entry friction.
- Keep planning and editing distinct from in-workout operation.
- Show progress honestly without gamification or fabricated coaching.
- Stay compact and reliable enough for a Raspberry Pi home server.
