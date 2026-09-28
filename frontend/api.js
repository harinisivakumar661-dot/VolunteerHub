const BASE_URL = 'http://localhost:8083/api'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  let config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }

  let res
  try {
    res = await fetch(url, config)
  } catch (e) {
    throw new Error('Cannot connect to the server. Please make sure the backend is running.')
  }

  if (res.status === 204) return null

  let data
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  if (!res.ok) {
    const message =
      (data && data.message) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${res.status}`
    throw new Error(message)
  }

  return data
}

export const api = {
  // Events
  getEvents: () => request('/events'),
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (event) => request('/events', { method: 'POST', body: event }),
  updateEvent: (id, event) => request(`/events/${id}`, { method: 'PUT', body: event }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),

  // Volunteers
  getVolunteers: () => request('/volunteers'),
  getVolunteer: (id) => request(`/volunteers/${id}`),
  createVolunteer: (volunteer) => request('/volunteers', { method: 'POST', body: volunteer }),
  updateVolunteer: (id, volunteer) => request(`/volunteers/${id}`, { method: 'PUT', body: volunteer }),
  deleteVolunteer: (id) => request(`/volunteers/${id}`, { method: 'DELETE' }),

  // Signups
  getSignups: () => request('/signups'),
  getSignup: (id) => request(`/signups/${id}`),
  createSignup: (eventId, volunteerId) =>
    request(`/signups?eventId=${eventId}&volunteerId=${volunteerId}`, { method: 'POST' }),
  cancelSignup: (id) => request(`/signups/${id}/cancel`, { method: 'PUT' }),

  // Attendance
  getAttendance: () => request('/attendance'),
  getAttendanceById: (id) => request(`/attendance/${id}`),
  createAttendance: (signupId, attended, hoursContributed) =>
    request(`/attendance?signupId=${signupId}&attended=${attended}&hoursContributed=${hoursContributed}`, { method: 'POST' }),
  updateAttendance: (id, attendance) => request(`/attendance/${id}`, { method: 'PUT', body: attendance }),
  deleteAttendance: (id) => request(`/attendance/${id}`, { method: 'DELETE' }),
}
