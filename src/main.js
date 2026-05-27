import { joinChannel, sendLocation, leaveChannel } from './supabase.js'
import { initMap, updateMyPosition, updateOtherPosition, removeOtherMarker, fitBothMarkers, getDistance, formatDistance, destroyMap, getMyLatLng } from './map.js'
import { startWatching, stopWatching, setEcoMode } from './geolocation.js'
import { generateCode, createSession, joinSessionByCode, getMySession, deactivateSession } from './session.js'
import { showScreen, showModal, hideModal, showToast, updateInfoPanel, setPartnerStatus, formatTimeAgo, setupModalCloseHandlers } from './ui.js'
import { signUp, signIn, signOut, getAuthSession, getProfile, updateProfile, onAuthChange } from './auth.js'
import { icons, setIcon, markerColors, avatarList } from './icons.js'
import { initPWA, promptInstall } from './pwa.js'
import { requestNotificationPermission, sendNotification } from './notifications.js'

// ===== State =====
let currentUser = null
let currentProfile = null
let currentSession = null
let currentCode = null
let otherUsername = null
let otherColor = '#8b5cf6'
let lastOtherUpdate = null
let infoInterval = null
let isRegisterMode = false
let isOnMap = false
let batteryLevel = null
let notificationsEnabled = false

// ===== DOM =====
const $ = id => document.getElementById(id)

// ===== Init =====
async function init() {
  initPWA()
  setupIcons()
  setupModalCloseHandlers()
  setupEventListeners()
  setupSettings()
  setupOfflineDetection()

  const session = await getAuthSession()
  if (navigator.getBattery) {
    try {
      const bat = await navigator.getBattery()
      batteryLevel = bat.level
      bat.addEventListener('levelchange', () => batteryLevel = bat.level)
    } catch {}
  }

  if (session) {
    currentUser = session.user
    currentProfile = await getProfile(currentUser.id)
    if (currentProfile) {
      // Apply settings
      const theme = currentProfile.theme || 'light'
      document.documentElement.dataset.theme = theme
      $('toggle-theme').checked = (theme === 'dark')
      
      const eco = !!currentProfile.eco_mode
      setEcoMode(eco)
      $('toggle-eco').checked = eco

      // Check for active session → auto-resume to map
      try {
        const activeSession = await getMySession()
        if (activeSession) {
          currentSession = activeSession
          currentCode = activeSession.code
          await startRealtime(activeSession.code)
          goToMap()
          return
        }
      } catch {}
      // No active session → show dashboard
      await showDashboard()
      return
    }
  }
  showScreen('auth-screen')
}

function setupIcons() {
  setIcon($('toggle-password'), 'eye')
  $('dashboard-user-icon').innerHTML = icons.user
  setIcon($('btn-logout'), 'logOut')
  setIcon($('btn-settings'), 'settings')
  $('icon-create').innerHTML = icons.plus
  $('icon-join').innerHTML = icons.arrowRight
  setIcon($('btn-copy-code'), 'copy')
  $('btn-recenter').innerHTML = icons.target
  setIcon($('btn-back-home'), 'home')
  setIcon($('btn-close-settings'), 'x')
  setIcon($('btn-map-settings'), 'settings')
  setIcon($('btn-session-menu'), 'moreVertical')
  $('icon-kill-session').innerHTML = icons.trash
  $('icon-theme').innerHTML = icons.moon
  $('icon-eco').innerHTML = icons.leaf
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Auth
  const validateAuth = () => {
    const hasUser = $('auth-username').value.trim().length >= 2
    const hasPass = $('auth-password').value.length >= 6
    const passMatch = !isRegisterMode || $('auth-confirm').value === $('auth-password').value
    $('btn-auth-submit').disabled = !(hasUser && hasPass && (!isRegisterMode || passMatch))
  }
  $('auth-username').addEventListener('input', validateAuth)
  $('auth-password').addEventListener('input', validateAuth)
  $('auth-confirm').addEventListener('input', validateAuth)
  $('btn-auth-submit').addEventListener('click', handleAuth)
  $('auth-password').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('btn-auth-submit').disabled) handleAuth() })
  $('auth-confirm').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('btn-auth-submit').disabled) handleAuth() })

  // Toggle register/login
  $('auth-toggle-link').addEventListener('click', toggleAuthMode)

  // Password visibility
  let pwVisible = false
  $('toggle-password').addEventListener('click', () => {
    pwVisible = !pwVisible
    $('auth-password').type = pwVisible ? 'text' : 'password'
    setIcon($('toggle-password'), pwVisible ? 'eyeOff' : 'eye')
  })

  // Dashboard
  $('btn-create').addEventListener('click', handleCreate)
  $('btn-join').addEventListener('click', () => showModal('join-modal'))
  $('btn-rejoin').addEventListener('click', handleRejoin)
  $('btn-logout').addEventListener('click', handleLogout)
  $('btn-settings').addEventListener('click', openSettings)

  // Session menu (3 dots on active session card)
  $('btn-session-menu').addEventListener('click', toggleSessionMenu)
  $('btn-kill-session').addEventListener('click', () => {
    closeSessionMenu()
    showModal('kill-modal')
  })
  $('btn-kill-confirm').addEventListener('click', () => { hideModal('kill-modal'); handleKillSession() })

  // Close session menu on click outside
  document.addEventListener('click', (e) => {
    const menu = $('session-menu')
    const btn = $('btn-session-menu')
    if (menu.style.display !== 'none' && !menu.contains(e.target) && !btn.contains(e.target)) {
      closeSessionMenu()
    }
  })

  // Join modal
  $('session-code-input').addEventListener('input', () => {
    $('session-code-input').value = $('session-code-input').value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    $('btn-join-confirm').disabled = $('session-code-input').value.length < 6
  })
  $('session-code-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('btn-join-confirm').disabled) handleJoin() })
  $('btn-join-confirm').addEventListener('click', handleJoin)

  // Copy code
  $('btn-copy-code').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(currentCode); showToast('Code copié !', 'success') }
    catch { showToast('Impossible de copier', 'error') }
  })

  // Skip wait
  $('btn-skip-wait').addEventListener('click', () => { hideModal('created-modal'); goToMap() })

  // Map — back to home (does NOT kill session)
  $('btn-recenter').addEventListener('click', fitBothMarkers)
  $('btn-back-home').addEventListener('click', handleBackHome)
  $('btn-map-settings').addEventListener('click', openSettings)

  // Settings
  $('btn-settings-logout').addEventListener('click', () => { closeSettings(); handleLogout() })
  $('btn-install').addEventListener('click', async () => {
    const ok = await promptInstall()
    if (ok) showToast('Application installée !', 'success')
  })
  
  $('toggle-theme').addEventListener('change', handleThemeChange)
  $('toggle-eco').addEventListener('change', handleEcoChange)
  $('toggle-notif').addEventListener('change', handleNotifChange)
}

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode
  $('auth-confirm-group').style.display = isRegisterMode ? 'block' : 'none'
  $('btn-auth-submit').textContent = isRegisterMode ? 'Créer mon compte' : 'Se connecter'
  
  const toggleHtml = isRegisterMode
    ? 'Déjà un compte ? <span id="auth-toggle-link" style="color:var(--text-accent);cursor:pointer;font-weight:600;">Se connecter</span>'
    : 'Pas de compte ? <span id="auth-toggle-link" style="color:var(--text-accent);cursor:pointer;font-weight:600;">Créer un compte</span>'
    
  $('auth-toggle-text').innerHTML = toggleHtml
  $('auth-toggle-link').addEventListener('click', toggleAuthMode)
  validateAuth() // Re-validate the form since confirm password might be hidden now
}

// ===== Session Menu =====
function toggleSessionMenu() {
  const menu = $('session-menu')
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none'
}

function closeSessionMenu() {
  $('session-menu').style.display = 'none'
}

// ===== Settings =====
function setupSettings() {
  const avatarGrid = $('avatar-grid')
  avatarList.forEach(name => {
    const btn = document.createElement('button')
    btn.className = 'avatar-option'
    btn.dataset.avatar = name
    btn.innerHTML = icons[name] || icons.user
    btn.addEventListener('click', () => selectAvatar(name))
    avatarGrid.appendChild(btn)
  })

  const colorGrid = $('color-grid')
  markerColors.forEach(c => {
    const btn = document.createElement('button')
    btn.className = 'color-option'
    btn.dataset.color = c.value
    btn.style.background = c.value
    btn.title = c.label
    btn.addEventListener('click', () => selectColor(c.value))
    colorGrid.appendChild(btn)
  })

  $('settings-backdrop').addEventListener('click', closeSettings)
  $('btn-close-settings').addEventListener('click', closeSettings)
}

function openSettings() {
  document.querySelectorAll('.avatar-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.avatar === (currentProfile?.avatar || 'user'))
  })
  document.querySelectorAll('.color-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === (currentProfile?.color || '#3b82f6'))
  })
  $('settings-panel').classList.add('open')
  $('settings-backdrop').classList.add('open')
}

function closeSettings() {
  $('settings-panel').classList.remove('open')
  $('settings-backdrop').classList.remove('open')
}

async function selectAvatar(name) {
  document.querySelectorAll('.avatar-option').forEach(el => el.classList.toggle('selected', el.dataset.avatar === name))
  currentProfile.avatar = name // optimistic update
  
  if (isOnMap) {
    const coords = getMyLatLng()
    if (coords) {
      updateMyPosition(coords[0], coords[1], currentProfile.username, currentProfile.color, currentProfile.avatar)
      sendLocation(coords[0], coords[1], currentProfile.username, currentUser.id, currentProfile.color, currentProfile.avatar)
    }
  }

  if (currentUser) {
    try {
      await updateProfile(currentUser.id, { avatar: name })
    } catch (err) {
      console.warn('Avatar save failed:', err.message)
      showToast('Sauvegarde échouée (vérifie la migration SQL)', 'error', 4000)
    }
  }
}

async function selectColor(color) {
  document.querySelectorAll('.color-option').forEach(el => el.classList.toggle('selected', el.dataset.color === color))
  currentProfile.color = color // optimistic update
  
  if (isOnMap) {
    const coords = getMyLatLng()
    if (coords) {
      updateMyPosition(coords[0], coords[1], currentProfile.username, currentProfile.color, currentProfile.avatar)
      sendLocation(coords[0], coords[1], currentProfile.username, currentUser.id, currentProfile.color, currentProfile.avatar)
    }
  }

  if (currentUser) {
    try {
      await updateProfile(currentUser.id, { color })
    } catch (err) {
      console.warn('Color save failed:', err.message)
      showToast('Sauvegarde échouée (vérifie la migration SQL)', 'error', 4000)
    }
  }
}

async function handleThemeChange(e) {
  const isDark = e.target.checked
  const theme = isDark ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  currentProfile.theme = theme
  if (currentUser) {
    try {
      await updateProfile(currentUser.id, { theme })
    } catch (err) { console.warn(err) }
  }
}

async function handleEcoChange(e) {
  const isEco = e.target.checked
  setEcoMode(isEco)
  currentProfile.eco_mode = isEco
  if (currentUser) {
    try {
      await updateProfile(currentUser.id, { eco_mode: isEco })
    } catch (err) { console.warn(err) }
  }
}

async function handleNotifChange(e) {
  const wantsNotif = e.target.checked
  if (wantsNotif) {
    const granted = await requestNotificationPermission()
    if (!granted) {
      $('toggle-notif').checked = false
      showToast('Notifications bloquées par le navigateur.', 'error')
      return
    }
  }
  notificationsEnabled = wantsNotif
}

// ===== Offline Detection =====
function setupOfflineDetection() {
  const banner = $('offline-banner')
  const updateStatus = () => {
    if (!navigator.onLine) {
      banner.classList.remove('hidden')
      banner.innerHTML = icons.wifiOff + ' Mode hors ligne — dernière position affichée'
    } else {
      banner.classList.add('hidden')
    }
  }
  window.addEventListener('online', () => { updateStatus(); showToast('Connexion rétablie', 'success') })
  window.addEventListener('offline', () => { updateStatus(); showToast('Connexion perdue', 'error') })
  updateStatus()
}

function saveLastPartnerPosition(lat, lng, username, color, avatar) {
  localStorage.setItem('localyly_last_partner', JSON.stringify({ lat, lng, username, color, avatar, time: Date.now() }))
}

function loadLastPartnerPosition() {
  try {
    const d = JSON.parse(localStorage.getItem('localyly_last_partner'))
    if (d && Date.now() - d.time < 24 * 60 * 60 * 1000) return d
  } catch {}
  return null
}

// ===== Auth Handlers =====
async function handleAuth() {
  const username = $('auth-username').value.trim()
  const password = $('auth-password').value

  $('btn-auth-submit').disabled = true
  $('btn-auth-submit').textContent = 'Chargement...'

  try {
    if (isRegisterMode) {
      if ($('auth-confirm').value !== password) { showToast('Mots de passe différents', 'error'); return }
      currentUser = await signUp(username, password)
      currentProfile = { id: currentUser.id, username, avatar: 'user', color: '#3b82f6', theme: 'light', eco_mode: false }
      showToast('Compte créé !', 'success')
    } else {
      currentUser = await signIn(username, password)
      currentProfile = await getProfile(currentUser.id)
    }
    
    // Apply settings
    if (currentProfile) {
      const theme = currentProfile.theme || 'light'
      document.documentElement.dataset.theme = theme
      $('toggle-theme').checked = (theme === 'dark')
      
      const eco = !!currentProfile.eco_mode
      setEcoMode(eco)
      $('toggle-eco').checked = eco
    }

    await showDashboard()
  } catch (err) {
    showToast(err.message, 'error', 4000)
  } finally {
    $('btn-auth-submit').disabled = false
    $('btn-auth-submit').textContent = isRegisterMode ? 'Créer mon compte' : 'Se connecter'
  }
}

async function handleLogout() {
  stopWatching()
  await leaveChannel()
  destroyMap()
  isOnMap = false
  if (infoInterval) { clearInterval(infoInterval); infoInterval = null }
  await signOut()
  currentUser = null; currentProfile = null; currentSession = null
  showScreen('auth-screen')
  showToast('Déconnecté', 'info')
}

// ===== Dashboard =====
async function showDashboard() {
  $('dashboard-username').textContent = currentProfile.username
  showScreen('dashboard-screen')

  try {
    const session = await getMySession()
    if (session) {
      currentSession = session
      currentCode = session.code
      $('active-session-code').textContent = session.code
      $('active-session-section').style.display = 'flex'
    } else {
      currentSession = null
      currentCode = null
      $('active-session-section').style.display = 'none'
    }
  } catch {
    $('active-session-section').style.display = 'none'
  }
  closeSessionMenu()
}

// ===== Session Handlers =====
async function handleCreate() {
  const code = generateCode()
  try {
    const session = await createSession(code, currentUser.id)
    currentSession = session; currentCode = code
    $('session-code-text').textContent = code
    showModal('created-modal')
    setTimeout(() => { $('btn-skip-wait').style.display = 'block' }, 3000)
    await startRealtime(code)
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
}

async function handleJoin() {
  const code = $('session-code-input').value.trim().toUpperCase()
  if (code.length < 6) return
  hideModal('join-modal')
  try {
    const session = await joinSessionByCode(code)
    currentSession = session; currentCode = code
    await startRealtime(code)
    goToMap()
  } catch (err) { showToast(err.message, 'error', 4000) }
}

async function handleRejoin() {
  if (!currentSession) return
  try {
    await startRealtime(currentSession.code)
    goToMap()
  } catch (err) { showToast('Erreur: ' + err.message, 'error') }
}

/**
 * Go back to dashboard WITHOUT killing the session.
 * Just pause watching and leave the realtime channel temporarily.
 */
async function handleBackHome() {
  stopWatching()
  await leaveChannel()
  if (infoInterval) { clearInterval(infoInterval); infoInterval = null }
  destroyMap()
  isOnMap = false
  otherUsername = null; lastOtherUpdate = null
  setPartnerStatus(false)
  updateInfoPanel({ distance: '—', partnerName: 'En attente...', lastUpdate: '—' })
  await showDashboard()
}

/**
 * Kill the session permanently (from dashboard menu).
 */
async function handleKillSession() {
  // If we were on the map for this session, clean up
  stopWatching()
  await leaveChannel()
  if (infoInterval) { clearInterval(infoInterval); infoInterval = null }
  destroyMap()
  isOnMap = false

  if (currentSession) { try { await deactivateSession(currentSession.id) } catch {} }
  currentSession = null; currentCode = null; otherUsername = null; lastOtherUpdate = null
  setPartnerStatus(false)
  updateInfoPanel({ distance: '—', partnerName: 'En attente...', lastUpdate: '—' })
  await showDashboard()
  showToast('Session supprimée', 'info')
}

// ===== Core Realtime =====
async function startRealtime(code) {
  const myColor = currentProfile?.color || '#3b82f6'
  const myAvatar = currentProfile?.avatar || 'user'

  await joinChannel(code, currentProfile.username, currentUser.id, {
    onLocation: handleIncomingLocation,
    onPresenceJoin: handlePresenceJoin,
    onPresenceLeave: handlePresenceLeave
  })

  initMap('map-container')
  $('session-badge').textContent = code

  const lastPartner = loadLastPartnerPosition()
  if (lastPartner) {
    updateOtherPosition(lastPartner.lat, lastPartner.lng, lastPartner.username, lastPartner.color, lastPartner.avatar)
    otherUsername = lastPartner.username
  }

  await startWatching((lat, lng, accuracy, speed) => {
    let activeStatus = null
    if (batteryLevel !== null && batteryLevel <= 0.15) {
      activeStatus = 'batteryLow'
    } else if (speed && speed > 3) {
      activeStatus = 'car'
    }

    updateMyPosition(lat, lng, currentProfile.username, currentProfile.color || myColor, currentProfile.avatar || myAvatar, activeStatus)
    sendLocation(lat, lng, currentProfile.username, currentUser.id, currentProfile.color || myColor, currentProfile.avatar || myAvatar, activeStatus)
  })

  if (infoInterval) clearInterval(infoInterval)
  infoInterval = setInterval(updateInfoDisplay, 1000)
}

function handleIncomingLocation(payload) {
  otherUsername = payload.username
  otherColor = payload.color || '#8b5cf6'
  const otherAvatar = payload.avatar || 'user'
  const otherStatus = payload.status || null
  lastOtherUpdate = payload.timestamp
  updateOtherPosition(payload.lat, payload.lng, payload.username, otherColor, otherAvatar, otherStatus)
  saveLastPartnerPosition(payload.lat, payload.lng, payload.username, otherColor, otherAvatar) // status not strictly needed offline
  updateInfoDisplay()
}

function handlePresenceJoin(presence) {
  setPartnerStatus(true, presence.username)
  showToast(`${presence.username} a rejoint !`, 'success')
  if (notificationsEnabled) sendNotification('Nouveau partenaire', `${presence.username} a rejoint la session !`)
  if ($('created-modal').classList.contains('active')) { hideModal('created-modal'); goToMap() }
}

function handlePresenceLeave(presence) {
  setPartnerStatus(false)
  removeOtherMarker()
  otherUsername = null; lastOtherUpdate = null
  updateInfoPanel({ partnerName: 'Déconnecté', distance: '—', lastUpdate: '—' })
  showToast(`${presence.username} s'est déconnecté`, 'error')
  if (notificationsEnabled) sendNotification('Partenaire déconnecté', `${presence.username} a quitté la session.`)
}

function goToMap() {
  isOnMap = true
  showScreen('map-screen')
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
}

function updateInfoDisplay() {
  updateInfoPanel({
    distance: formatDistance(getDistance()),
    partnerName: otherUsername || 'En attente...',
    lastUpdate: lastOtherUpdate ? formatTimeAgo(lastOtherUpdate) : '—'
  })
}

// ===== Boot =====
init()
