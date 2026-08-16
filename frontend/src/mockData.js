export const initialWorkouts = {
  A: [
    { id: 'chest', name: 'Chest', exercises: [
      { id: 'bench', name: 'Bench press', weight: 70, sets: 4, reps: 8, notes: 'Pause at the bottom' },
      { id: 'incline', name: 'Incline dumbbell press', weight: 24, sets: 3, reps: 10, notes: '30° bench' },
    ] },
    { id: 'shoulders', name: 'Shoulders', exercises: [
      { id: 'press', name: 'Shoulder press', weight: 20, sets: 3, reps: 8, notes: 'Controlled negative' },
      { id: 'laterals', name: 'Lateral raises', weight: 8, sets: 3, reps: 12, notes: 'Keep tension' },
    ] },
    { id: 'triceps', name: 'Triceps', exercises: [
      { id: 'pushdown', name: 'Cable pushdown', weight: 25, sets: 3, reps: 12, notes: 'Lock elbows in place' },
    ] },
  ],
  B: [
    { id: 'back', name: 'Back', exercises: [
      { id: 'pulldown', name: 'Lat pulldown', weight: 55, sets: 4, reps: 8, notes: 'Drive elbows down' },
      { id: 'row', name: 'Seated cable row', weight: 50, sets: 3, reps: 10, notes: 'Hold the squeeze' },
    ] },
    { id: 'legs', name: 'Legs', exercises: [
      { id: 'squat', name: 'Back squat', weight: 80, sets: 4, reps: 6, notes: 'Brace before descending' },
      { id: 'curl', name: 'Leg curl', weight: 35, sets: 3, reps: 12, notes: 'Slow negative' },
    ] },
    { id: 'biceps', name: 'Biceps', exercises: [
      { id: 'curl-bar', name: 'EZ-bar curl', weight: 25, sets: 3, reps: 10, notes: 'No swinging' },
    ] },
  ],
}

const daysAgo = (days) => {
  const value = new Date()
  value.setHours(12, 0, 0, 0)
  value.setDate(value.getDate() - days)
  return value.toISOString().slice(0, 10)
}

export const initialWeights = [55, 48, 41, 34, 27, 20, 8, 1].map((days, index) => ({
  date: daysAgo(days),
  value: [80.2, 79.9, 79.7, 79.8, 79.3, 79.0, 78.7, 78.4][index],
}))
