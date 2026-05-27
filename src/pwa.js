let deferredPrompt = null

/**
 * Initialize PWA install prompt handling.
 */
export function initPWA() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }

  // Capture install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    updateInstallButton()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    updateInstallButton()
  })

  // Initialize button state immediately
  updateInstallButton()
}

/**
 * Check if the app can be installed.
 */
export function canInstall() {
  return deferredPrompt !== null
}

/**
 * Check if already installed (standalone mode).
 */
export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         navigator.standalone === true
}

/**
 * Trigger the install prompt.
 */
export async function promptInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  updateInstallButton()
  return outcome === 'accepted'
}

/**
 * Update install button visibility.
 */
function updateInstallButton() {
  const btn = document.getElementById('btn-install')
  const hint = document.getElementById('install-hint')
  if (!btn || !hint) return

  if (isInstalled()) {
    btn.style.display = 'none'
    hint.style.display = 'block'
    hint.textContent = 'Application installée'
  } else if (canInstall()) {
    btn.style.display = 'flex'
    hint.style.display = 'none'
  } else {
    btn.style.display = 'none'
    hint.style.display = 'block'
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    if (isIOS) {
      hint.innerHTML = 'Sur iPhone : Touche l\'icône <b>Partager</b> en bas de Safari, puis <b>"Sur l\'écran d\'accueil"</b>.'
    } else {
      hint.innerHTML = 'Ouvre dans Chrome pour pouvoir installer l\'application.'
    }
  }
}
