let watchId = null
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
    if (!navigator.geolocation) {
      reject(new Error('Géolocalisation non supportée par ce navigateur.'))
      return
    }

    let firstPositionReceived = false

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords
        const now = Date.now()

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
      },
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
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000
      }
    )
  })
}

/**
 * Stop watching position.
 */
export function stopWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}
