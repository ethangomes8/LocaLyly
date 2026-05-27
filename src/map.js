import L from 'leaflet'
import { icons } from './icons.js'

let map = null
let myMarker = null
let otherMarker = null
let connectingLine = null
let myLine = null
let otherLine = null
let myLatLng = null
let otherLatLng = null
let myPath = []
let otherPath = []

const TILES_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILES_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'

/**
 * Create a custom pulsing dot marker with custom color.
 */
function createDotIcon(type, label, color, avatar, status) {
  const c = color || (type === 'me' ? '#3b82f6' : '#8b5cf6')
  const svgIcon = avatar && icons[avatar] ? icons[avatar] : icons.user || ''
  
  let statusHtml = ''
  if (status && icons[status]) {
    statusHtml = `<div class="marker-status" style="width:24px;height:24px;padding:4px;border-radius:50%;color:${c};display:flex;align-items:center;justify-content:center;">${icons[status]}</div>`
  }
  
  return L.divIcon({
    className: `marker-${type}`,
    html: `
      <div class="marker-dot">
        ${statusHtml}
        <div class="dot-glow" style="background:${c}"></div>
        <div class="dot-ring" style="border-color:${c}"></div>
        <div class="dot-core" style="background:${c};box-shadow:0 0 6px ${c}">${svgIcon}</div>
        <div class="marker-label" style="color:${c}">${label}</div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })
}

/**
 * Initialize the Leaflet map.
 * @param {string} containerId
 */
export function initMap(containerId) {
  map = L.map(containerId, {
    zoomControl: true,
    attributionControl: true,
    center: [46.6, 2.5], // France center
    zoom: 6
  })

  L.tileLayer(TILES_URL, {
    attribution: TILES_ATTR,
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map)

  // Position zoom controls top-right
  map.zoomControl.setPosition('topright')

  return map
}

/**
 * Update my position on the map.
 */
export function updateMyPosition(lat, lng, username, color, avatar, status) {
  myLatLng = [lat, lng]
  myPath.push(myLatLng)
  if (myPath.length > 50) myPath.shift()

  if (!myMarker) {
    myMarker = L.marker([lat, lng], {
      icon: createDotIcon('me', 'Moi', color, avatar, status),
      zIndexOffset: 1000
    }).addTo(map)

    // Center map on first position
    map.setView([lat, lng], 15, { animate: true })
  } else {
    myMarker.setLatLng([lat, lng])
    myMarker.setIcon(createDotIcon('me', 'Moi', color, avatar, status))
  }

  if (!myLine) {
    myLine = L.polyline(myPath, { color, weight: 3, opacity: 0.6, dashArray: '4, 6' }).addTo(map)
  } else {
    myLine.setLatLngs(myPath)
    myLine.setStyle({ color })
  }

  updateConnectingLine()
}

/**
 * Update the other person's position on the map.
 */
export function updateOtherPosition(lat, lng, username, color, avatar, status) {
  otherLatLng = [lat, lng]
  otherPath.push(otherLatLng)
  if (otherPath.length > 50) otherPath.shift()

  const popupContent = `<div style="text-align:center;font-family:var(--font-body);padding:4px;">
    <div style="font-weight:600;margin-bottom:10px;color:var(--text-primary);">${username || 'Ami'}</div>
    <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="btn btn-primary" style="text-decoration:none;display:inline-block;padding:8px 16px;font-size:0.85rem;border-radius:12px;color:white;background:var(--color-blue);">Ouvrir Google Maps</a>
  </div>`

  if (!otherMarker) {
    otherMarker = L.marker([lat, lng], {
      icon: createDotIcon('other', username || 'Ami', color, avatar, status),
      zIndexOffset: 999
    }).addTo(map)
    otherMarker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup' })
  } else {
    otherMarker.setLatLng([lat, lng])
    otherMarker.setIcon(createDotIcon('other', username || 'Ami', color, avatar, status))
    otherMarker.setPopupContent(popupContent)
  }

  if (!otherLine) {
    otherLine = L.polyline(otherPath, { color, weight: 3, opacity: 0.6, dashArray: '4, 6' }).addTo(map)
  } else {
    otherLine.setLatLngs(otherPath)
    otherLine.setStyle({ color })
  }

  updateConnectingLine()
}

/**
 * Update the animated connecting line between both markers.
 */
function updateConnectingLine() {
  if (!myLatLng || !otherLatLng) return

  if (!connectingLine) {
    connectingLine = L.polyline([myLatLng, otherLatLng], {
      color: '#6366f1',
      weight: 2,
      opacity: 0.5,
      dashArray: '8, 8',
      className: 'connecting-line'
    }).addTo(map)
  } else {
    connectingLine.setLatLngs([myLatLng, otherLatLng])
  }
}

/**
 * Remove the other person's marker.
 */
export function removeOtherMarker() {
  if (otherMarker) {
    map.removeLayer(otherMarker)
    otherMarker = null
  }
  if (connectingLine) {
    map.removeLayer(connectingLine)
    connectingLine = null
  }
  if (otherLine) {
    map.removeLayer(otherLine)
    otherLine = null
  }
  otherLatLng = null
  otherPath = []
}

/**
 * Fit the map to show both markers.
 */
export function fitBothMarkers() {
  if (myLatLng && otherLatLng) {
    const bounds = L.latLngBounds([myLatLng, otherLatLng])
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: true })
  } else if (myLatLng) {
    map.setView(myLatLng, 15, { animate: true })
  }
}

/**
 * Calculate distance between the two markers in meters.
 * Uses Haversine formula.
 */
export function getDistance() {
  if (!myLatLng || !otherLatLng) return null

  const R = 6371e3
  const toRad = (deg) => deg * Math.PI / 180
  const lat1 = toRad(myLatLng[0])
  const lat2 = toRad(otherLatLng[0])
  const dLat = toRad(otherLatLng[0] - myLatLng[0])
  const dLon = toRad(otherLatLng[1] - myLatLng[1])

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Format distance for display.
 */
export function formatDistance(meters) {
  if (meters === null) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Get current coordinates of my marker
 */
export function getMyLatLng() {
  return myLatLng
}

/**
 * Destroy the map (cleanup).
 */
export function destroyMap() {
  if (map) {
    map.remove()
    map = null
    myMarker = null
    otherMarker = null
    connectingLine = null
    myLine = null
    otherLine = null
    myLatLng = null
    otherLatLng = null
    myPath = []
    otherPath = []
  }
}
