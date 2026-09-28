import { api } from './api.js'
import { showToast, openModal, closeModal, icon, skeletonRows, skeletonCards, emptyState, errorState, statusBadge, eventStatusBadge, capacityBar, formatDate, formatDateTime, formatTimeAgo, todayLong, esc } from './components.js'
import { setConnectionStatus } from './main.js'

let appState = {
  events: [],
  volunteers: [],
  signups: [],
  attendance: [],
}

export async function loadAllData() {
  const results = await Promise.allSettled([
    api.getEvents(),
    api.getVolunteers(),
    api.getSignups(),
    api.getAttendance(),
  ])

  const allFailed = results.every((r) => r.status === 'rejected')
  setConnectionStatus(!allFailed)

  appState.events = results[0].status === 'fulfilled' ? results[0].value : []
  appState.volunteers = results[1].status === 'fulfilled' ? results[1].value : []
  appState.signups = results[2].status === 'fulfilled' ? results[2].value : []
  appState.attendance = results[3].status === 'fulfilled' ? results[3].value : []
  return appState
}

export function getState() { return appState }
export function setState(key, value) { appState[key] = value }

// ===== Helpers =====

function getEventId(event) {
  return event?.eventId ?? event?.id;
}

function getVolunteerId(volunteer) {
  return volunteer?.volunteerId ?? volunteer?.id;
}

function getEventCapacity(event) {
  return Number(event?.volunteerCapacity ?? event?.capacity ?? 0);
}

export function getRegisteredCount(eventId) {
  return appState.signups.filter((signup) => {
    const signupEventId =
      signup?.event?.eventId ??
      signup?.event?.id ??
      signup?.eventId;

    const status = (signup?.status || '').toUpperCase();

    return (
      String(signupEventId) === String(eventId) &&
      status === 'REGISTERED'
    );
  }).length;
}

export function getAvailableSlots(event) {
  const capacity = getEventCapacity(event);
  const registered = getRegisteredCount(getEventId(event));

  return Math.max(0, capacity - registered);
}

export function getVolunteerName(signup) {
  if (signup?.volunteer?.name) {
    return signup.volunteer.name;
  }

  if (signup?.volunteerName) {
    return signup.volunteerName;
  }

  const volunteerId =
    signup?.volunteer?.volunteerId ??
    signup?.volunteer?.id ??
    signup?.volunteerId;

  const volunteer = appState.volunteers.find(
    (v) => String(getVolunteerId(v)) === String(volunteerId)
  );

  return volunteer?.name || '-';
}

export function getEventName(signup) {
  if (signup?.event?.eventName) {
    return signup.event.eventName;
  }

  if (signup?.eventName) {
    return signup.eventName;
  }

  const eventId =
    signup?.event?.eventId ??
    signup?.event?.id ??
    signup?.eventId;

  const event = appState.events.find(
    (e) => String(getEventId(e)) === String(eventId)
  );

  return event?.eventName || '-';
}

function getVolunteerSignupCount(volunteerId) {
  return appState.signups.filter((signup) => {
    const signupVolunteerId =
      signup?.volunteer?.volunteerId ??
      signup?.volunteer?.id ??
      signup?.volunteerId;

    const status = (signup?.status || '').toUpperCase();

    return (
      String(signupVolunteerId) === String(volunteerId) &&
      status === 'REGISTERED'
    );
  }).length;
}

function getEventStatus(event) {
  const registered = getRegisteredCount(getEventId(event));
  const capacity = getEventCapacity(event);

  const eventDate = new Date(event?.eventDate || 0);
  const now = new Date();

  if (capacity > 0 && registered >= capacity) {
    return 'FULL';
  }

  if (
    eventDate.getTime() > 0 &&
    eventDate < now
  ) {
    return 'COMPLETED';
  }

  return 'UPCOMING';
}
// ===== DASHBOARD ======
export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="dash-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-desc">Welcome to VolunteerHub. Here's what's happening with your volunteer community.</p>
      </div>
      <div class="dash-date">${todayLong()}</div>
    </div>
    <div id="dash-kpis">${skeletonCards(6)}</div>
    <div id="dash-main"></div>
  `

  try {
    await loadAllData()
    const { events, volunteers, signups, attendance } = appState
    const hasData = events.length > 0 || volunteers.length > 0 || signups.length > 0

    const totalEvents = events.length
    const totalVolunteers = volunteers.length
    const totalSignups = signups.length
    const now = new Date()
    const upcomingEvents = events
  .filter((e) => new Date(e.eventDate || 0) >= now)
  .sort(
    (a, b) =>
      new Date(a.eventDate || 0) -
      new Date(b.eventDate || 0)
  )
    const totalHours = attendance.filter((a) => a.attended === true).reduce((sum, a) => sum + (a.hoursContributed || 0), 0)
    const openSlots = events.reduce((sum, e) => sum + getAvailableSlots(e), 0)

    // KPI cards
    document.getElementById('dash-kpis').innerHTML = renderKpiCards({
      totalEvents, totalVolunteers, totalSignups, totalHours, upcomingCount: upcomingEvents.length, openSlots
    })

    // Main content
    document.getElementById('dash-main').innerHTML = `
      <div class="dash-grid">
        <div class="dash-card dash-card-wide">
          <div class="dash-card-header">
            <div class="dash-card-title">
              ${icon('events')}
              <h2>Upcoming Events</h2>
            </div>
            <span class="dash-card-badge">${upcomingEvents.length} scheduled</span>
          </div>
          <div class="dash-card-body" id="dash-upcoming">
            ${renderUpcomingEvents(upcomingEvents)}
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-header">
            <div class="dash-card-title">
              ${icon('activity')}
              <h2>Recent Activity</h2>
            </div>
          </div>
          <div class="dash-card-body" id="dash-activity">
            ${renderRecentActivity()}
          </div>
        </div>
      </div>

      <div class="dash-grid dash-grid-charts">
        <div class="dash-card">
          <div class="dash-card-header">
            <div class="dash-card-title">
              ${icon('trend')}
              <h2>Volunteer Hours Overview</h2>
            </div>
          </div>
          <div class="dash-card-body">
            ${renderHoursChart(attendance)}
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-header">
            <div class="dash-card-title">
              ${icon('pieChart')}
              <h2>Event Capacity Overview</h2>
            </div>
          </div>
          <div class="dash-card-body">
            ${renderCapacityDonut(events)}
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-header">
            <div class="dash-card-title">
              ${icon('barChart')}
              <h2>Event Participation</h2>
            </div>
          </div>
          <div class="dash-card-body">
            ${renderParticipationChart(events)}
          </div>
        </div>
      </div>
    `
  } catch (e) {
    container.innerHTML = `
      <div class="dash-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-desc">Welcome to VolunteerHub.</p>
        </div>
      </div>
      ${errorState(e.message)}
    `
  }
}

function renderKpiCards({ totalEvents, totalVolunteers, totalSignups, totalHours, upcomingCount, openSlots }) {
  const cards = [
    { label: 'Total Events', value: totalEvents, icon: 'events', color: 'blue', sub: totalEvents === 0 ? 'No events yet' : `${upcomingCount} upcoming` },
    { label: 'Total Volunteers', value: totalVolunteers, icon: 'volunteers', color: 'teal', sub: totalVolunteers === 0 ? 'No volunteers yet' : 'Active members' },
    { label: 'Total Signups', value: totalSignups, icon: 'signups', color: 'amber', sub: totalSignups === 0 ? 'No signups yet' : 'Registrations' },
    { label: 'Volunteer Hours', value: totalHours, icon: 'clock', color: 'green', sub: totalHours === 0 ? 'No hours logged' : 'Hours contributed' },
    { label: 'Upcoming Events', value: upcomingCount, icon: 'calendar', color: 'indigo', sub: upcomingCount === 0 ? 'None scheduled' : 'Coming up' },
    { label: 'Open Slots', value: openSlots, icon: 'layers', color: 'rose', sub: openSlots === 0 ? 'No open slots' : 'Available spots' },
  ]
  return `<div class="stat-cards">${cards.map((c) => `
    <div class="stat-card stat-${c.color}">
      <div class="stat-card-icon">${icon(c.icon)}</div>
      <div class="stat-card-body">
        <div class="stat-card-value">${c.value}</div>
        <div class="stat-card-label">${c.label}</div>
        <div class="stat-card-sub">${c.sub}</div>
      </div>
    </div>
  `).join('')}</div>`
}



function renderUpcomingEvents(upcomingEvents) {
  if (upcomingEvents.length === 0) {
    return emptyState(
      'No upcoming events',
      'Create your first event to start managing volunteers.',
      'events'
    );
  }

  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Date</th>
            <th>Location</th>
            <th>Registered</th>
            <th>Open Slots</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${upcomingEvents.slice(0, 6).map((event) => {

            const registered =
              getRegisteredCount(getEventId(event));

            const capacity =
              getEventCapacity(event);

            const available =
              getAvailableSlots(event);

            const status =
              getEventStatus(event);

            return `
              <tr>

                <td>
                  <div class="cell-primary">
                    ${esc(event.eventName || '-')}
                  </div>
                </td>

                <td>
                  <span class="cell-date">
                    ${formatDate(event.eventDate)}
                  </span>
                </td>

                <td>
                  <div class="cell-location">
                    ${icon('mapPin', 'cell-icon')}
                    ${esc(event.location || '-')}
                  </div>
                </td>

                <td style="min-width:140px">
                  ${capacityBar(registered, capacity)}
                </td>

                <td>
                  <span class="slot-pill ${available === 0 ? 'slot-pill-full' : ''}">
                    ${available} slots
                  </span>
                </td>

                <td>
                  ${statusBadge(status)}
                </td>

              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

}
function renderRecentActivity() {
  const activities = [];

  // New events
  appState.events.forEach((e) => {
    activities.push({
      type: 'event',
      text: `Event "${esc(e.eventName || 'Unnamed')}" created`,
      date: e.createdAt || e.eventDate,
      icon: 'events',
      badge: 'NEW',
      badgeCls: 'badge-blue'
    });
  });

  // New volunteers
  appState.volunteers.forEach((v) => {
    activities.push({
      type: 'volunteer',
      text: `${esc(v.name || 'Unknown')} registered as volunteer`,
      date: v.createdAt,
      icon: 'userPlus',
      badge: 'NEW',
      badgeCls: 'badge-teal'
    });
  });

  // Signups
  appState.signups.forEach((s) => {
    const isCancelled =
      (s.status || '').toUpperCase() === 'CANCELLED';

    activities.push({
      type: 'signup',
      text: `${esc(getVolunteerName(s))} signed up for ${esc(getEventName(s))}`,
      date: s.signupDate,
      icon: isCancelled ? 'userX' : 'signups',
      badge: isCancelled ? 'CANCELLED' : 'REGISTERED',
      badgeCls: isCancelled ? 'badge-red' : 'badge-blue'
    });
  });

  // Attendance
  appState.attendance.forEach((a) => {
    const signupId =
      a.signup?.signupId ?? a.signupId;

    const signup = appState.signups.find(
  (s) => String(s.signupId ?? s.id) === String(signupId)
)

    if (signup) {
      activities.push({
        type: 'attendance',
        text: `Attendance recorded for ${esc(getVolunteerName(signup))} — ${esc(getEventName(signup))}`,
        date: a.date || a.createdAt,
        icon: 'userCheck',
        badge: a.attended ? 'ATTENDED' : 'MISSED',
        badgeCls: a.attended ? 'badge-green' : 'badge-red'
      });
    }
  });

  // Sort newest first
  activities.sort(
    (a, b) =>
      new Date(b.date || 0) -
      new Date(a.date || 0)
  );

  const recent = activities.slice(0, 6);

  if (recent.length === 0) {
    return emptyState(
      'No recent activity',
      'Activity will appear here as data is added.',
      'activity'
    );
  }

  return `
    <div class="activity-list">
      ${recent.map((a) => `
        <div class="activity-item">

          <div class="activity-icon activity-${a.badgeCls}">
            ${icon(a.icon)}
          </div>

          <div class="activity-content">
            <div class="activity-text">
              ${a.text}
            </div>

            <div class="activity-time">
              ${a.date ? formatTimeAgo(a.date) : ''}
            </div>
          </div>

          <span class="status-badge ${a.badgeCls}">
            ${a.badge}
          </span>

        </div>
      `).join('')}
    </div>
  `;
}
// ===== CSS Charts =====
function renderHoursChart(attendance) {
  const attendedRecords = attendance.filter((a) => a.attended === true)
  if (attendedRecords.length === 0) {
    return emptyState('No hours data', 'Attendance records will appear here.', 'trend')
  }

  // Group by date or index, cumulative hours
  const sorted = [...attendedRecords].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
  let cumulative = 0
  const points = sorted.map((r) => {
    cumulative += (r.hoursContributed || 0)
    return cumulative
  })

  const maxVal = Math.max(...points, 1)
  const w = 100, h = 100
  const stepX = points.length > 1 ? w / (points.length - 1) : w
  const coords = points.map((p, i) => `${i * stepX},${h - (p / maxVal) * h}`)
  const linePath = `M ${coords.join(' L ')}`
  const areaPath = `M 0,${h} L ${coords.join(' L ')} L ${(points.length - 1) * stepX},${h} Z`
  const totalHours = cumulative

  return `
    <div class="chart-wrap">
      <div class="chart-total">
        <span class="chart-total-label">Total Hours</span>
        <span class="chart-total-value">${totalHours}</span>
      </div>
      <div class="chart-area">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="chart-svg">
          <defs>
            <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0d9488" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#0d9488" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#hoursGrad)"/>
          <path d="${linePath}" fill="none" stroke="#0d9488" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
          ${points.map((p, i) => `<circle cx="${i * stepX}" cy="${h - (p / maxVal) * h}" r="1.2" fill="#0d9488" vector-effect="non-scaling-stroke"/>`).join('')}
        </svg>
      </div>
      <div class="chart-x-labels">
        <span>${formatDate(sorted[0].date || '')}</span>
        <span>${formatDate(sorted[sorted.length - 1].date || '')}</span>
      </div>
    </div>
  `
}

function renderCapacityDonut(events) {
  if (events.length === 0) {
    return emptyState('No capacity data', 'Events will appear here once created.', 'pieChart')
  }
  const totalRegistered = events.reduce((sum, e) => sum + getRegisteredCount(e.id || e.eventId), 0)
  const totalOpen = events.reduce((sum, e) => sum + getAvailableSlots(e), 0)
  const total = totalRegistered + totalOpen
  const registeredPct = total > 0 ? (totalRegistered / total) * 100 : 0
  const openPct = total > 0 ? (totalOpen / total) * 100 : 0
  const circumference = 2 * Math.PI * 40
  const dashRegistered = (registeredPct / 100) * circumference

  return `
    <div class="donut-wrap">
      <div class="donut-chart">
        <svg viewBox="0 0 100 100" class="donut-svg">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" stroke-width="10"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#2563eb" stroke-width="10"
            stroke-dasharray="${dashRegistered} ${circumference}"
            stroke-dashoffset="0"
            transform="rotate(-90 50 50)"
            class="donut-ring"/>
        </svg>
        <div class="donut-center">
          <div class="donut-total">${total}</div>
          <div class="donut-label">Total Slots</div>
        </div>
      </div>
      <div class="donut-legend">
        <div class="legend-item">
          <span class="legend-dot legend-blue"></span>
          <span class="legend-label">Registered</span>
          <span class="legend-value">${totalRegistered} (${Math.round(registeredPct)}%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot legend-gray"></span>
          <span class="legend-label">Available</span>
          <span class="legend-value">${totalOpen} (${Math.round(openPct)}%)</span>
        </div>
      </div>
    </div>
  `
}

function renderParticipationChart(events) {
  if (events.length === 0) {
    return emptyState('No participation data', 'Signup counts will appear here.', 'barChart')
  }
  const data = events.map((e) => ({
    name: (e.name || e.eventName || '?'),
    count: getRegisteredCount(e.id || e.eventId),
  }))
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const colors = ['#2563eb', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316']

  return `
    <div class="bar-chart-wrap">
      <div class="bar-chart-bars">
        ${data.slice(0, 8).map((d, i) => {
          const pct = (d.count / maxCount) * 100
          return `
          <div class="bar-chart-col">
            <div class="bar-chart-value">${d.count}</div>
            <div class="bar-chart-bar" style="height:${Math.max(pct, 2)}%; background:${colors[i % colors.length]}"></div>
            <div class="bar-chart-label" title="${esc(d.name)}">${esc(d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name)}</div>
          </div>`
        }).join('')}
      </div>
    </div>
  `
}

// ===== EVENTS ======
export async function renderEvents(container) {
  container.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Events</h1>
        <p class="page-desc">Manage your community events and track volunteer capacity.</p>
      </div>
      <button class="btn btn-primary" id="btn-new-event">${icon('plus')} New Event</button>
    </div>
    <div class="filter-bar">
      <div class="filter-search">
        ${icon('search', 'filter-search-icon')}
        <input type="text" id="event-search" placeholder="Search events by name or location..." />
      </div>
      <select id="event-filter-status" class="filter-select">
        <option value="">All Statuses</option>
        <option value="UPCOMING">Upcoming</option>
        <option value="FULL">Full</option>
        <option value="COMPLETED">Completed</option>
      </select>
    </div>
    <div id="events-content">${skeletonRows(7, 5)}</div>
  `

  document.getElementById('btn-new-event').addEventListener('click', () => showEventForm())
  document.getElementById('event-search').addEventListener('input', () => renderEventsTable())
  document.getElementById('event-filter-status').addEventListener('change', () => renderEventsTable())

  try {
    await loadAllData()
    renderEventsTable()
  } catch (e) {
    document.getElementById('events-content').innerHTML = errorState(e.message)
  }
}

function renderEventsTable() {
  const { events } = appState
  const term = (document.getElementById('event-search')?.value || '').toLowerCase()
  const statusFilter = document.getElementById('event-filter-status')?.value || ''

  let filtered = events.filter((e) => {
    const name = (e.name || e.eventName || '').toLowerCase()
    const loc = (e.location || '').toLowerCase()
    return name.includes(term) || loc.includes(term)
  })

  if (statusFilter) {
    filtered = filtered.filter((e) => getEventStatus(e) === statusFilter)
  }

  const content = document.getElementById('events-content')
  if (filtered.length === 0) {
    content.innerHTML = emptyState('No events found', 'Try adjusting your search or create a new event.', 'events')
    return
  }

  content.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Location</th>
            <th>Date</th>
            <th>Capacity</th>
            <th>Registered</th>
            <th>Open Slots</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((e) => {
            const registered = getRegisteredCount(e.id || e.eventId)
            const available = getAvailableSlots(e)
            const status = getEventStatus(e)
            return `
            <tr>
              <td><div class="cell-primary">${esc(e.name || e.eventName || '-')}</div></td>
              <td><div class="cell-location">${icon('mapPin', 'cell-icon')}${esc(e.location || '-')}</div></td>
              <td><span class="cell-date">${formatDate(e.date || e.eventDate)}</span></td>
              <td>${e.volunteerCapacity || 0}</td>
<td style="min-width:130px">
  ${capacityBar(registered, e.volunteerCapacity || 0)}
</td>
              <td><span class="slot-pill ${available === 0 ? 'slot-pill-full' : ''}">${available}</span></td>
              <td>${statusBadge(status)}</td>
              <td class="actions-cell">
                <button class="btn-icon btn-edit" data-edit-id="${e.id || e.eventId}" title="Edit">${icon('edit')}</button>
                <button class="btn-icon btn-delete" data-delete-id="${e.id || e.eventId}" title="Delete">${icon('trash')}</button>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `

  content.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editId
      const event = appState.events.find((e) => String(e.id || e.eventId) === String(id))
      showEventForm(event)
    })
  })
  content.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteEvent(btn.dataset.deleteId))
  })
}

function showEventForm(event = null) {
  const isEdit = !!event
  const e = event || {}
  openModal(
    isEdit ? 'Edit Event' : 'Create New Event',
    `
    <form id="event-form" class="modal-form">
      <div class="form-group">
        <label>Event Name <span class="req">*</span></label>
        <input type="text" id="ef-name" value="${esc(e.name || e.eventName || '')}" placeholder="e.g. Community Cleanup Drive" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Location <span class="req">*</span></label>
          <input type="text" id="ef-location" value="${esc(e.location || '')}" placeholder="e.g. Central Park" required />
        </div>
        <div class="form-group">
          <label>Event Date <span class="req">*</span></label>
          <input type="date" id="ef-date" value="${(e.date || e.eventDate || '').split('T')[0]}" required />
        </div>
      </div>
      <div class="form-group">
        <label>Volunteer Capacity <span class="req">*</span></label>
        <input type="number" id="ef-capacity" value="${e.capacity || ''}" min="1" placeholder="e.g. 25" required />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="ef-description" rows="3" placeholder="Brief description of the event...">${esc(e.description || '')}</textarea>
      </div>
    </form>
    `,
    {
      icon: 'events',
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save">${isEdit ? 'Update Event' : 'Create Event'}</button>
      `,
    }
  )
  document.getElementById('modal-cancel').addEventListener('click', closeModal)
  document.getElementById('modal-save').addEventListener('click', () => saveEvent(isEdit, e.id || e.eventId))
}

async function saveEvent(isEdit, id) {
  const name = document.getElementById('ef-name').value.trim()
  const location = document.getElementById('ef-location').value.trim()
  const date = document.getElementById('ef-date').value
  const capacity = parseInt(document.getElementById('ef-capacity').value, 10)
  const description = document.getElementById('ef-description').value.trim()

  if (!name || !location || !date || !capacity) {
    showToast('Please fill in all required fields.', 'error')
    return
  }

  const payload = {
  eventName: name,
  location: location,
  eventDate: date,
  volunteerCapacity: capacity
}
  const saveBtn = document.getElementById('modal-save')
  saveBtn.disabled = true
  saveBtn.innerHTML = '<span class="btn-spinner"></span> Saving...'

  try {
    if (isEdit) {
      await api.updateEvent(id, payload)
      showToast('Event updated successfully.')
    } else {
      await api.createEvent(payload)
      showToast('Event created successfully.')
    }
    closeModal()
    await loadAllData()
    renderEventsTable()
  } catch (e) {
    showToast(e.message, 'error')
    saveBtn.disabled = false
    saveBtn.textContent = isEdit ? 'Update Event' : 'Create Event'
  }
}

async function confirmDeleteEvent(id) {
  openModal('Delete Event', `
    <div class="confirm-dialog">
      <div class="confirm-icon">${icon('trash', 'lg')}</div>
      <p>Are you sure you want to delete this event? This action cannot be undone and will remove all associated data.</p>
    </div>
  `, {
    icon: 'trash',
    footerHtml: `
      <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
      <button class="btn btn-danger" id="modal-confirm-delete">Delete Event</button>
    `,
  })
  document.getElementById('modal-cancel').addEventListener('click', closeModal)
  document.getElementById('modal-confirm-delete').addEventListener('click', async () => {
    const btn = document.getElementById('modal-confirm-delete')
    btn.disabled = true
    btn.innerHTML = '<span class="btn-spinner"></span> Deleting...'
    try {
      await api.deleteEvent(id)
      showToast('Event deleted successfully.')
      closeModal()
      await loadAllData()
      renderEventsTable()
    } catch (e) {
      showToast(e.message, 'error')
      closeModal()
    }
  })
}

// ===== VOLUNTEERS ======
export async function renderVolunteers(container) {
  container.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Volunteers</h1>
        <p class="page-desc">Manage your volunteer community and their information.</p>
      </div>
      <button class="btn btn-primary" id="btn-new-volunteer">${icon('userPlus')} Add Volunteer</button>
    </div>
    <div class="filter-bar">
      <div class="filter-search">
        ${icon('search', 'filter-search-icon')}
        <input type="text" id="volunteer-search" placeholder="Search volunteers by name or email..." />
      </div>
      <div class="filter-count" id="vol-count"></div>
    </div>
    <div id="volunteers-content">${skeletonRows(4, 5)}</div>
  `

  document.getElementById('btn-new-volunteer').addEventListener('click', () => showVolunteerForm())
  document.getElementById('volunteer-search').addEventListener('input', () => renderVolunteersTable())

  try {
    await loadAllData()
    renderVolunteersTable()
  } catch (e) {
    document.getElementById('volunteers-content').innerHTML = errorState(e.message)
  }
}

function renderVolunteersTable() {
  const { volunteers } = appState
  const term = (document.getElementById('volunteer-search')?.value || '').toLowerCase()
  const filtered = volunteers.filter((v) => {
    const name = `${v.firstName || ''} ${v.lastName || ''} ${v.name || ''}`.toLowerCase()
    const email = (v.email || '').toLowerCase()
    return name.includes(term) || email.includes(term)
  })

  const countEl = document.getElementById('vol-count')
  if (countEl) countEl.textContent = `${filtered.length} volunteer${filtered.length !== 1 ? 's' : ''}`

  const content = document.getElementById('volunteers-content')
  if (filtered.length === 0) {
    content.innerHTML = emptyState('No volunteers found', 'Try adjusting your search or add a new volunteer.', 'volunteers')
    return
  }

  content.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Signups</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((v) => {
            const name = `${v.firstName || ''} ${v.lastName || ''}`.trim() || v.name || '-'
            const initials = name.split(' ').map((w) => w[0] || '').join('').substring(0, 2).toUpperCase()
            const signupCount = getVolunteerSignupCount(v.volunteerId)
            return `
            <tr>
              <td>
                <div class="cell-user">
                  <div class="cell-avatar">${esc(initials)}</div>
                  <div class="cell-primary">${esc(name)}</div>
                </div>
              </td>
              <td>
                <div class="cell-contact">${icon('mail', 'cell-icon')}${esc(v.email || '-')}</div>
              </td>
              <td>
                <div class="cell-contact">${icon('phone', 'cell-icon')}${esc(v.phone || v.phoneNumber || '-')}</div>
              </td>
              <td><span class="count-pill">${signupCount}</span></td>
              <td class="actions-cell">
                <button class="btn-icon btn-edit" data-edit-id="${v.id}" title="Edit">${icon('edit')}</button>
                <button class="btn-icon btn-delete" data-delete-id="${v.id}" title="Delete">${icon('trash')}</button>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `

  content.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editId
      const vol = appState.volunteers.find((v) => String(v.id) === String(id))
      showVolunteerForm(vol)
    })
  })
  content.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteVolunteer(btn.dataset.deleteId))
  })
}

function showVolunteerForm(volunteer = null) {
  const isEdit = !!volunteer
  const v = volunteer || {}
  const name = `${v.firstName || ''} ${v.lastName || ''}`.trim() || v.name || ''
  openModal(
    isEdit ? 'Edit Volunteer' : 'Add New Volunteer',
    `
    <form id="volunteer-form" class="modal-form">
      <div class="form-group">
        <label>Full Name <span class="req">*</span></label>
        <input type="text" id="vf-name" value="${esc(name)}" placeholder="e.g. Jane Doe" required />
      </div>
      <div class="form-group">
        <label>Email <span class="req">*</span></label>
        <input type="email" id="vf-email" value="${esc(v.email || '')}" placeholder="jane@example.com" required />
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input type="text" id="vf-phone" value="${esc(v.phone || v.phoneNumber || '')}" placeholder="+1 555-0100" />
      </div>
    </form>
    `,
    {
      icon: 'volunteers',
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save">${isEdit ? 'Update Volunteer' : 'Add Volunteer'}</button>
      `,
    }
  )
  document.getElementById('modal-cancel').addEventListener('click', closeModal)
  document.getElementById('modal-save').addEventListener('click', () => saveVolunteer(isEdit, v.id))
}

async function saveVolunteer(isEdit, id) {
  const fullName = document.getElementById('vf-name').value.trim()
  const email = document.getElementById('vf-email').value.trim()
  const phone = document.getElementById('vf-phone').value.trim()

  if (!fullName || !email) {
    showToast('Please fill in all required fields.', 'error')
    return
  }

  const parts = fullName.split(' ')
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  const payload = { firstName, lastName, name: fullName, email, phone, phoneNumber: phone }

  const saveBtn = document.getElementById('modal-save')
  saveBtn.disabled = true
  saveBtn.innerHTML = '<span class="btn-spinner"></span> Saving...'

  try {
    if (isEdit) {
      await api.updateVolunteer(id, payload)
      showToast('Volunteer updated successfully.')
    } else {
      await api.createVolunteer(payload)
      showToast('Volunteer added successfully.')
    }
    closeModal()
    await loadAllData()
    renderVolunteersTable()
  } catch (e) {
    showToast(e.message, 'error')
    saveBtn.disabled = false
    saveBtn.textContent = isEdit ? 'Update Volunteer' : 'Add Volunteer'
  }
}

async function confirmDeleteVolunteer(id) {
  openModal('Delete Volunteer', `
    <div class="confirm-dialog">
      <div class="confirm-icon">${icon('trash', 'lg')}</div>
      <p>Are you sure you want to delete this volunteer? This action cannot be undone.</p>
    </div>
  `, {
    icon: 'trash',
    footerHtml: `
      <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
      <button class="btn btn-danger" id="modal-confirm-delete">Delete Volunteer</button>
    `,
  })
  document.getElementById('modal-cancel').addEventListener('click', closeModal)
  document.getElementById('modal-confirm-delete').addEventListener('click', async () => {
    const btn = document.getElementById('modal-confirm-delete')
    btn.disabled = true
    btn.innerHTML = '<span class="btn-spinner"></span> Deleting...'
    try {
      await api.deleteVolunteer(id)
      showToast('Volunteer deleted successfully.')
      closeModal()
      await loadAllData()
      renderVolunteersTable()
    } catch (e) {
      showToast(e.message, 'error')
      closeModal()
    }
  })
}

// ===== SIGNUPS ======
export async function renderSignups(container) {
  container.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Signups</h1>
        <p class="page-desc">Manage volunteer event registrations and track capacity.</p>
      </div>
      <button class="btn btn-primary" id="btn-new-signup">${icon('plus')} New Signup</button>
    </div>
    <div id="signups-content">${skeletonRows(5, 5)}</div>
  `

  document.getElementById('btn-new-signup').addEventListener('click', () => showSignupForm())

  try {
    await loadAllData()
    renderSignupsTable()
  } catch (e) {
    document.getElementById('signups-content').innerHTML = errorState(e.message)
  }
}

function renderSignupsTable() {
  const { signups } = appState
  const content = document.getElementById('signups-content')

  if (signups.length === 0) {
    content.innerHTML = emptyState('No signups yet', 'Create a signup to register a volunteer for an event.', 'signups')
    return
  }

  content.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Volunteer</th>
            <th>Signup Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${signups.map((s) => {
            const id = s.id || s.signupId
            const status = (s.status || 'REGISTERED').toUpperCase()
            return `
            <tr>
              <td><div class="cell-primary">${esc(getEventName(s))}</div></td>
              <td>
                <div class="cell-user">
                  <div class="cell-avatar sm">${esc((getVolunteerName(s).split(' ').map((w) => w[0] || '').join('')).substring(0, 2).toUpperCase())}</div>
                  <div>${esc(getVolunteerName(s))}</div>
                </div>
              </td>
              <td><span class="cell-date">${formatDateTime(s.signupDate || s.createdAt || s.date)}</span></td>
              <td>${statusBadge(status)}</td>
              <td class="actions-cell">
                ${status !== 'CANCELLED' ? `<button class="btn btn-sm btn-warning" data-cancel-id="${id}">Cancel</button>` : '<span class="text-muted">—</span>'}
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `

  content.querySelectorAll('[data-cancel-id]').forEach((btn) => {
    btn.addEventListener('click', () => cancelSignupAction(btn.dataset.cancelId))
  })
}

function showSignupForm() {
  const { events, volunteers } = appState

  if (events.length === 0 || volunteers.length === 0) {
    showToast('You need at least one event and one volunteer to create a signup.', 'info')
    return
  }

  const eventOptions = events.map((e) => {
    const slots = getAvailableSlots(e)
    const full = slots === 0 ? ' (FULL)' : ` (${slots} slots open)`
    return `<option value="${e.id || e.eventId}">${esc(e.name || e.eventName)}${full}</option>`
  }).join('')

  const volunteerOptions = volunteers.map((v) => {
  const name = v.name || '-'
  return `<option value="${v.volunteerId}">${esc(name)}</option>`
}).join('')

  openModal(
    'Create New Signup',
    `
    <form id="signup-form" class="modal-form">
      <div class="form-group">
        <label>Event <span class="req">*</span></label>
        <select id="sf-event"><option value="">Select an event...</option>${eventOptions}</select>
      </div>
      <div class="form-group">
        <label>Volunteer <span class="req">*</span></label>
        <select id="sf-volunteer"><option value="">Select a volunteer...</option>${volunteerOptions}</select>
      </div>
      <div class="form-hint-bar">${icon('info', 'hint-icon')} Select an event and volunteer to register a new signup. Full events cannot accept new volunteers.</div>
    </form>
    `,
    {
      icon: 'signups',
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save">Create Signup</button>
      `,
    }
  )
  document.getElementById('modal-cancel').addEventListener('click', closeModal)
  document.getElementById('modal-save').addEventListener('click', saveSignup)
}

async function saveSignup() {
  const eventId = document.getElementById('sf-event').value
  const volunteerId = document.getElementById('sf-volunteer').value

  if (!eventId || !volunteerId) {
    showToast('Please select both an event and a volunteer.', 'error')
    return
  }

  const event = appState.events.find(
    (e) => String(e.eventId ?? e.id) === String(eventId)
  )

  if (event && getAvailableSlots(event) === 0) {
    showToast('Event capacity is full. Signup rejected.', 'error')
    return
  }

  const saveBtn = document.getElementById('modal-save')
  saveBtn.disabled = true
  saveBtn.innerHTML = '<span class="btn-spinner"></span> Saving...'

  try {
    console.log('Signup Request:', {
      eventId,
      volunteerId
    })

    await api.createSignup(eventId, volunteerId)

    showToast('Signup created successfully.')
    closeModal()
    await loadAllData()
    renderSignupsTable()
  } catch (e) {
    showToast(e.message || 'Signup failed.', 'error')
    saveBtn.disabled = false
    saveBtn.textContent = 'Create Signup'
  }
}
async function cancelSignupAction(id) {
  openModal('Cancel Signup', `
    <div class="confirm-dialog">
      <div class="confirm-icon confirm-icon-warning">${icon('userX', 'lg')}</div>
      <p>Are you sure you want to cancel this signup? The volunteer will be unregistered from the event.</p>
    </div>
  `, {
    icon: 'signups',
    footerHtml: `
      <button class="btn btn-secondary" id="modal-cancel">No, Keep It</button>
      <button class="btn btn-warning" id="modal-confirm-cancel">Yes, Cancel Signup</button>
    `,
  })
  document.getElementById('modal-cancel').addEventListener('click', closeModal)
  document.getElementById('modal-confirm-cancel').addEventListener('click', async () => {
    const btn = document.getElementById('modal-confirm-cancel')
    btn.disabled = true
    btn.innerHTML = '<span class="btn-spinner"></span> Cancelling...'
    try {
      await api.cancelSignup(id)
      showToast('Signup cancelled successfully.')
      closeModal()
      await loadAllData()
      renderSignupsTable()
    } catch (e) {
      showToast(e.message, 'error')
      closeModal()
    }
  })
}

// ===== ATTENDANCE ======
export async function renderAttendance(container) {
  container.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Attendance</h1>
        <p class="page-desc">Track volunteer attendance and contributed hours.</p>
      </div>
    </div>
    <div id="attendance-content">${skeletonRows(5, 5)}</div>
  `

  try {
    await loadAllData()
    renderAttendanceTable()
  } catch (e) {
    document.getElementById('attendance-content').innerHTML = errorState(e.message)
  }
}

function renderAttendanceTable() {
  const { attendance, signups } = appState
  const content = document.getElementById('attendance-content')

  if (attendance.length === 0 && signups.length === 0) {
    content.innerHTML = emptyState('No attendance records', 'Record attendance for volunteer signups to track hours.', 'attendance')
    return
  }

 const signupIdsWithAttendance = new Set(
  attendance.map((a) =>
    String(a.signUp?.signupId ?? a.signupId)
  )
)

const signupsWithoutAttendance = signups.filter(
  (s) => (s.status || 'REGISTERED').toUpperCase() !== 'CANCELLED' &&
          !signupIdsWithAttendance.has(String(s.signupId ?? s.id))
)

  let rowsHtml
  if (attendance.length > 0) {
    rowsHtml = attendance.map((a) => {
      const signupId =
  a.signUp?.signupId ?? a.signupId
      const signup = appState.signups.find((s) => String(s.id || s.signupId) === String(signupId))
      const event = signup ? getEventName(signup) : '-'
      const volunteer = signup ? getVolunteerName(signup) : '-'
      const attended = a.attended === true || a.attended === 'true'
      return `
        <tr>
          <td><div class="cell-primary">${esc(event)}</div></td>
          <td>
            <div class="cell-user">
              <div class="cell-avatar sm">${esc(volunteer.split(' ').map((w) => w[0] || '').join('').substring(0, 2).toUpperCase())}</div>
              <div>${esc(volunteer)}</div>
            </div>
          </td>
          <td><span class="mono">#${esc(signupId || '-')}</span></td>
          <td>${attended ? `<span class="att-yes">${icon('check', 'att-icon')} Yes</span>` : `<span class="att-no">${icon('x', 'att-icon')} No</span>`}</td>
          <td><span class="hours-pill">${a.hoursContributed || 0}h</span></td>
          <td class="actions-cell">
            <button class="btn-icon btn-edit" data-edit-id="${a.attendanceId ?? a.id}" title="Edit">
            <button class="btn-icon btn-delete" data-delete-id="${a.attendanceId ?? a.id}" title="Delete">${icon('trash')}</button>
          </td>
        </tr>
      `
    }).join('')
  } else {
    rowsHtml = `<tr><td colspan="6" class="text-center text-muted" style="padding:32px">No attendance records yet. Use the form above to record attendance.</td></tr>`
  }

  content.innerHTML = `
    ${signupsWithoutAttendance.length > 0 ? `
      <div class="dash-card record-attendance-card">
        <div class="dash-card-header">
          <div class="dash-card-title">
            ${icon('userCheck')}
            <h2>Record New Attendance</h2>
          </div>
          <span class="dash-card-badge">${signupsWithoutAttendance.length} pending</span>
        </div>
        <div class="dash-card-body">
          <div class="attendance-form-inline">
            <div class="form-group" style="flex:1; min-width:200px">
              <select id="att-signup">
                <option value="">Select a signup to record attendance...</option>
                ${signupsWithoutAttendance.map((s) => {
                  const id = s.id || s.signupId
                  return `<option value="${id}">${esc(getEventName(s))} — ${esc(getVolunteerName(s))}</option>`
                }).join('')}
              </select>
            </div>
            <button class="btn btn-primary" id="btn-record-attendance">${icon('userCheck')} Record Attendance</button>
          </div>
        </div>
      </div>
    ` : ''}

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Volunteer</th>
            <th>Signup ID</th>
            <th>Attended</th>
            <th>Hours</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `

  const recordBtn = document.getElementById('btn-record-attendance')
  if (recordBtn) {
    recordBtn.addEventListener('click', () => {
      const signupId = document.getElementById('att-signup').value
      if (!signupId) {
        showToast('Please select a signup first.', 'error')
        return
      }
      showAttendanceForm(null, signupId)
    })
  }

  content.querySelectorAll('.btn-edit').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.editId

    const att = appState.attendance.find(
      (a) => String(a.attendanceId ?? a.id) === String(id)
    )

    showAttendanceForm(att)
  })
})
  content.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteAttendance(btn.dataset.deleteId))
  })
}

function showAttendanceForm(attendance = null, signupId = null) {
  const isEdit = !!attendance
  const attended = isEdit ? (attendance.attended === true || attendance.attended === 'true') : false
  const hours = isEdit ? (attendance.hoursContributed || 0) : 0

  openModal(
    isEdit ? 'Edit Attendance' : 'Record Attendance',
    `
    <form id="attendance-form" class="modal-form">
      <div class="form-group">
        <label>Attendance Status</label>
        <div class="radio-group">
          <label class="radio-card ${!attended ? 'active' : ''}">
            <input type="radio" name="af-attended" value="false" ${!attended ? 'checked' : ''} />
            ${icon('x', 'radio-icon')}
            <span>Not Attended</span>
          </label>
          <label class="radio-card ${attended ? 'active' : ''}">
            <input type="radio" name="af-attended" value="true" ${attended ? 'checked' : ''} />
            ${icon('check', 'radio-icon')}
            <span>Attended</span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label>Hours Contributed</label>
        <input type="number" id="af-hours" value="${hours}" min="0" step="0.5" placeholder="0" />
      </div>
      <div class="form-hint-bar">
        ${icon('info', 'hint-icon')}
        <span>If attended is <strong>No</strong>, hours must be 0. If attended is <strong>Yes</strong>, hours must be greater than 0.</span>
      </div>
    </form>
    `,
    {
      icon: 'attendance',
      footerHtml: `
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save">${isEdit ? 'Update Attendance' : 'Save Attendance'}</button>
      `,
    }
  )

  document.getElementById('modal-cancel').addEventListener('click', closeModal)
  document.getElementById('modal-save').addEventListener('click', () => saveAttendance(isEdit, attendance, signupId))

  // Toggle radio card active state
  document.querySelectorAll('input[name="af-attended"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.radio-card').forEach((card) => card.classList.remove('active'))
      radio.closest('.radio-card').classList.add('active')
    })
  })
}

async function saveAttendance(isEdit, attendance, signupId) {
  const attendedStr = document.querySelector('input[name="af-attended"]:checked')?.value
  const attended = attendedStr === 'true'
  const hours = parseFloat(document.getElementById('af-hours').value) || 0

  if (!attended && hours !== 0) {
    showToast('If attended is No, hours must be 0.', 'error')
    return
  }
  if (attended && hours <= 0) {
    showToast('If attended is Yes, hours must be greater than 0.', 'error')
    return
  }

  const saveBtn = document.getElementById('modal-save')
  saveBtn.disabled = true
  saveBtn.innerHTML = '<span class="btn-spinner"></span> Saving...'

  try {
    if (isEdit) {
      await api.updateAttendance(
  attendance.attendanceId ?? attendance.id,
  { attended, hoursContributed: hours }
)
      showToast('Attendance updated successfully.')
    } else {
      await api.createAttendance(signupId, attended, hours)
      showToast('Attendance recorded successfully.')
    }
    closeModal()
    await loadAllData()
    renderAttendanceTable()
  } catch (e) {
    showToast(e.message, 'error')
    saveBtn.disabled = false
    saveBtn.textContent = isEdit ? 'Update Attendance' : 'Save Attendance'
  }
}

async function confirmDeleteAttendance(id) {
  openModal('Delete Attendance', `
    <div class="confirm-dialog">
      <div class="confirm-icon">${icon('trash', 'lg')}</div>
      <p>Are you sure you want to delete this attendance record?</p>
    </div>
  `, {
    icon: 'trash',
    footerHtml: `
      <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
      <button class="btn btn-danger" id="modal-confirm-delete">Delete Record</button>
    `,
  })
  document.getElementById('modal-cancel').addEventListener('click', closeModal)
  document.getElementById('modal-confirm-delete').addEventListener('click', async () => {
    const btn = document.getElementById('modal-confirm-delete')
    btn.disabled = true
    btn.innerHTML = '<span class="btn-spinner"></span> Deleting...'
    try {
      await api.deleteAttendance(id)
      showToast('Attendance deleted successfully.')
      closeModal()
      await loadAllData()
      renderAttendanceTable()
    } catch (e) {
      showToast(e.message, 'error')
      closeModal()
    }
  })
}
