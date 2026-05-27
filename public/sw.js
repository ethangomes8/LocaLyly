const CACHE_NAME = 'localyly-v1'

// Assets to cache immediately on install
const PRECACHE = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
]

// Install: precache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for pages/API, cache-first for static assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Skip non-GET and Supabase API calls
  if (e.request.method !== 'GET') return
  if (url.hostname.includes('supabase')) return

  // Map tiles: cache with limit
  if (url.hostname.includes('basemaps.cartocdn.com')) {
    e.respondWith(
      caches.open('localyly-tiles').then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        try {
          const resp = await fetch(e.request)
          if (resp.ok) cache.put(e.request, resp.clone())
          return resp
        } catch { return cached || new Response('', { status: 503 }) }
      })
    )
    return
  }

  // Google Fonts: cache-first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open('localyly-fonts').then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        const resp = await fetch(e.request)
        cache.put(e.request, resp.clone())
        return resp
      })
    )
    return
  }

  // App shell: network-first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const clone = resp.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        return resp
      })
      .catch(() => caches.match(e.request))
  )
})
