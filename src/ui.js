/**
 * Show a screen (and hide all others).
 */
export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  const target = document.getElementById(screenId)
  if (target) {
    target.classList.add('active')
  }
}

/**
 * Show a modal.
 */
export function showModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) modal.classList.add('active')
}

/**
 * Hide a modal.
 */
export function hideModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) modal.classList.remove('active')
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 * @param {number} duration - ms
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = message
  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('leaving')
    toast.addEventListener('animationend', () => toast.remove())
  }, duration)
}

/**
 * Update the info panel values.
 */
export function updateInfoPanel({ distance, partnerName, lastUpdate }) {
  if (distance !== undefined) {
    document.getElementById('distance-value').textContent = distance
  }
  if (partnerName !== undefined) {
    document.getElementById('partner-name').textContent = partnerName
  }
  if (lastUpdate !== undefined) {
    document.getElementById('last-update').textContent = lastUpdate
  }
}

/**
 * Update the status indicator.
 */
export function setPartnerStatus(online, username) {
  const dot = document.getElementById('status-dot')
  const text = document.getElementById('status-text')

  if (online) {
    dot.classList.add('online')
    text.textContent = `${username} est en ligne`
  } else {
    dot.classList.remove('online')
    text.textContent = 'En attente...'
  }
}

/**
 * Format a timestamp as relative time in French.
 */
export function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return 'À l\'instant'
  if (seconds < 60) return `Il y a ${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Il y a ${minutes}min`
  return `Il y a ${Math.floor(minutes / 60)}h`
}

/**
 * Setup close-modal buttons (via data-close-modal attribute).
 */
export function setupModalCloseHandlers() {
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => {
      hideModal(el.dataset.closeModal)
    })
  })
}
