import './style.css'
import { icon, closeModal, showToast } from './components.js'
import { renderDashboard, renderEvents, renderVolunteers, renderSignups, renderAttendance } from './pages.js'

const routes = {
  dashboard: renderDashboard,
  events: renderEvents,
  volunteers: renderVolunteers,
  signups: renderSignups,
  attendance: renderAttendance,
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'events', label: 'Events', icon: 'events' },
  { id: 'volunteers', label: 'Volunteers', icon: 'volunteers' },
  { id: 'signups', label: 'Signups', icon: 'signups' },
  { id: 'attendance', label: 'Attendance', icon: 'attendance' },
]

let currentRoute = 'dashboard'
let backendConnected = false

function renderShell() {
  document.querySelector('#app').innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <div class="logo-mark">${icon('heart')}</div>
            <div class="logo-text">
              <div class="sidebar-title">VolunteerHub</div>
              <div class="sidebar-subtitle">NGO Management</div>
            </div>
          </div>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section-label">Menu</div>
          ${navItems.map((item) => `
            <a href="#${item.id}" class="nav-item ${item.id === currentRoute ? 'active' : ''}" data-route="${item.id}">
              <span class="nav-icon">${icon(item.icon)}</span>
              <span class="nav-label">${item.label}</span>
              <span class="nav-chevron">${icon('chevronRight')}</span>
            </a>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-footer-card">
            <div class="sidebar-footer-icon">${icon('heart')}</div>
            <div class="sidebar-footer-text">
              <div class="sf-title">VolunteerHub</div>
              <div class="sf-version">v1.0</div>
            </div>
          </div>
        </div>
      </aside>

      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <main class="main-content">
        <header class="topbar">
          <button class="menu-toggle" id="menu-toggle">${icon('menu')}</button>
          <div class="topbar-search">
            ${icon('search', 'search-icon')}
            <input type="text" id="global-search" placeholder="Search events, volunteers..." />
          </div>
          <div class="topbar-right">
            <div class="connection-indicator" id="conn-indicator">
              <span class="conn-dot conn-checking"></span>
              <span class="conn-text">Connecting...</span>
            </div>
            <button class="topbar-icon-btn" title="Notifications">
              ${icon('bell')}
              <span class="notif-dot"></span>
            </button>
            <div class="topbar-date" id="topbar-date"></div>
            <div class="topbar-profile">
              <div class="profile-avatar">A</div>
              <div class="profile-info">
                <div class="profile-name">Admin</div>
                <div class="profile-role">Administrator</div>
              </div>
            </div>
          </div>
        </header>
        <div class="page-content" id="page-content"></div>
      </main>
    </div>

    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title-row">
            <span class="modal-icon" id="modal-icon"></span>
            <h2 id="modal-title"></h2>
          </div>
          <button class="modal-close" id="modal-close-x">${icon('x')}</button>
        </div>
        <div class="modal-body" id="modal-body"></div>
        <div class="modal-footer" id="modal-footer"></div>
      </div>
    </div>

    <div class="toast-container" id="toast-container"></div>
  `

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault()
      navigateTo(item.dataset.route)
    })
  })

  document.getElementById('modal-close-x').addEventListener('click', closeModal)
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal()
  })

  document.getElementById('menu-toggle').addEventListener('click', toggleSidebar)
  document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar)

  document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  // Global search - navigates to events or volunteers page and filters
  const searchInput = document.getElementById('global-search')
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const term = searchInput.value.trim().toLowerCase()
      if (term) {
        navigateTo('events')
        setTimeout(() => {
          const eventSearch = document.getElementById('event-search')
          if (eventSearch) {
            eventSearch.value = term
            eventSearch.dispatchEvent(new Event('input'))
          }
        }, 100)
      }
    }
  })
}

export function setConnectionStatus(status) {
  backendConnected = status
  const indicator = document.getElementById('conn-indicator')
  if (!indicator) return
  if (status === true) {
    indicator.innerHTML = `<span class="conn-dot conn-ok"></span><span class="conn-text">Backend Connected</span>`
  } else if (status === false) {
    indicator.innerHTML = `<span class="conn-dot conn-err"></span><span class="conn-text">Backend Offline</span>`
  } else {
    indicator.innerHTML = `<span class="conn-dot conn-checking"></span><span class="conn-text">Connecting...</span>`
  }
}

function navigateTo(route) {
  if (!routes[route]) route = 'dashboard'
  currentRoute = route

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.route === route)
  })

  document.getElementById('sidebar').classList.remove('sidebar-open')
  document.getElementById('sidebar-overlay').classList.remove('show')

  const content = document.getElementById('page-content')
  content.innerHTML = ''
  routes[route](content)
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('sidebar-open')
  document.getElementById('sidebar-overlay').classList.toggle('show')
}

function init() {
  renderShell()
  setConnectionStatus(null)
  const hash = window.location.hash.replace('#', '') || 'dashboard'
  navigateTo(hash)
  window.addEventListener('hashchange', () => {
    const h = window.location.hash.replace('#', '') || 'dashboard'
    navigateTo(h)
  })
}

init()
