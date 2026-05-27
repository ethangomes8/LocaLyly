/**
 * Web Notifications API wrapper
 */

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Ce navigateur ne supporte pas les notifications desktop/push.')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export function sendNotification(title, body) {
  if (!('Notification' in window)) return

  if (Notification.permission === 'granted') {
    try {
      // Create a native notification
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png', // For Android status bar
        vibrate: [200, 100, 200]
      })
    } catch (e) {
      // On some mobile browsers, new Notification() must be called from a service worker.
      // We gracefully fallback or use service worker if available
      navigator.serviceWorker?.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
          vibrate: [200, 100, 200]
        })
      }).catch(err => console.error('Notification error:', err))
    }
  }
}
