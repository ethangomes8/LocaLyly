import { createClient } from '@supabase/supabase-js'
import { deriveKey, encryptPayload, decryptPayload } from './crypto.js'

const SUPABASE_URL = 'https://itkgahxvggpxglonhfze.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0a2dhaHh2Z2dweGdsb25oZnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNDk0ODMsImV4cCI6MjA5MzcyNTQ4M30.gl3m0aXBZsyGYue5q-cWOOjARxwQopVYq54HFwl5QUU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let channel = null
let sessionKey = null // Store the derived E2EE key

/**
 * Join a realtime channel for a session.
 */
export async function joinChannel(code, username, userId, callbacks) {
  if (channel) {
    await supabase.removeChannel(channel)
    channel = null
  }

  // Derive the E2EE key from the session code
  sessionKey = await deriveKey(code)

  channel = supabase.channel(`session-${code}`, {
    config: { presence: { key: userId } }
  })

  channel.on('broadcast', { event: 'location' }, async ({ payload }) => {
    // payload is the encrypted string
    if (!sessionKey || typeof payload !== 'string') return
    
    const decrypted = await decryptPayload(payload, sessionKey)
    if (!decrypted) return // Decryption failed

    if (decrypted.user_id === userId) return
    callbacks.onLocation?.(decrypted)
  })

  channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    const others = newPresences.filter(p => p.user_id !== userId)
    if (others.length > 0) callbacks.onPresenceJoin?.(others[0])
  })

  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    const others = leftPresences.filter(p => p.user_id !== userId)
    if (others.length > 0) callbacks.onPresenceLeave?.(others[0])
  })

  return new Promise((resolve, reject) => {
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          username,
          online_at: new Date().toISOString()
        })
        resolve()
      } else if (status === 'CHANNEL_ERROR') {
        reject(new Error('Erreur de connexion au canal'))
      }
    })
  })
}

/**
 * Send current location to the channel (E2EE Encrypted).
 */
export async function sendLocation(lat, lng, username, userId, color, avatar, status) {
  if (!channel || !sessionKey) return

  const payloadObj = { user_id: userId, username, lat, lng, color, avatar, status, timestamp: Date.now() }
  const encryptedPayload = await encryptPayload(payloadObj, sessionKey)

  channel.send({
    type: 'broadcast',
    event: 'location',
    payload: encryptedPayload
  })
}

/**
 * Leave the current channel.
 */
export async function leaveChannel() {
  if (channel) {
    await channel.untrack()
    await supabase.removeChannel(channel)
    channel = null
  }
}
