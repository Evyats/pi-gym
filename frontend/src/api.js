const API_ROOT = `${import.meta.env.BASE_URL}api`

async function request(path, options) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || `Request failed (${response.status})`)
  }
  if (response.status === 204) return null
  return response.json()
}

export function loadGymState() {
  return request('/state')
}

export function saveWorkout(workoutId, groups) {
  return request(`/workouts/${workoutId}`, { method: 'PUT', body: JSON.stringify({ groups }) })
}

export function saveBodyWeight(value, measuredDate) {
  return request('/weights', { method: 'POST', body: JSON.stringify({ value, measured_date: measuredDate }) })
}

export function deleteBodyWeight(measuredDate) {
  return request(`/weights/${measuredDate}`, { method: 'DELETE' })
}
