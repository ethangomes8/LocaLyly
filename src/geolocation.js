import { Capacitor, registerPlugin } from '@capacitor/core'
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation')

let watchId = null
let watcherId = null // For Capacitor native watcher
let lastSentTime = 0
let throttleMs = 2000 // default 2s

export function setEcoMode(enabled) {
  throttleMs = enabled ? 15000 : 2000
}

/**
 * Start watching position. Calls `callback(lat, lng, accuracy)` throttled.
 * @param {Function} callback
 * @returns {Promise<void>} Resolves when first position is obtained
 */
export function startWatching(callback) {
  return new Promise((resolve, reject) => {
    let firstPositionReceived = false

    const handlePosition = (coords) => {
      const { latitude, longitude, accuracy, speed } = coords
      const now = Date.now()

      // Ignore highly inaccurate positions (e.g., cell tower triangulation with >150m error)
      if (accuracy > 150) return

      // Always process first position immediately
      if (!firstPositionReceived) {
        firstPositionReceived = true
        callback(latitude, longitude, accuracy, speed)
        lastSentTime = now
        resolve()
        return
      }

      // Throttle subsequent updates
      if (now - lastSentTime >= throttleMs) {
        callback(latitude, longitude, accuracy, speed)
        lastSentTime = now
      }
    }

    // --- Native iOS/Android (Capacitor) ---
    if (Capacitor.isNativePlatform()) {
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "LocaLyly partage ta position en direct.",
          backgroundTitle: "Partage de position",
          requestPermissions: true,
          stale: false,
          distanceFilter: 1
        },
        (location, error) => {
          if (error) {
            if (!firstPositionReceived) reject(new Error('Erreur GPS en arrière-plan: ' + error.message))
            return
          }
          handlePosition(location)
        }
      ).then(id => {
        watcherId = id
      }).catch(err => reject(new Error('Impossible d\'activer le GPS: ' + err.message)))
      return
    }

    // --- Web Browser (PWA) Fallback ---
    if (!navigator.geolocation) {
      reject(new Error('Géolocalisation non supportée par ce navigateur.'))
      return
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => handlePosition(position.coords),
      (error) => {
        let message
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permission de géolocalisation refusée. Active la localisation dans les paramètres de ton navigateur.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Position indisponible. Vérifie que le GPS est activé.'
            break
          case error.TIMEOUT:
            message = 'Délai de géolocalisation expiré. Réessaie.'
            break
          default:
            message = 'Erreur de géolocalisation inconnue.'
        }

        if (!firstPositionReceived) {
          reject(new Error(message))
        } else {
          console.warn('GPS Error:', message)
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    )
  })
}

/**
 * Stop watching position
 */
export function stopWatching() {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  if (watcherId !== null && Capacitor.isNativePlatform()) {
    BackgroundGeolocation.removeWatcher({ id: watcherId })
    watcherId = null
  }
}
