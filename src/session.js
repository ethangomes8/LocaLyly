import { supabase } from './supabase.js'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Generate a random 6-character session code.
 */
export function generateCode() {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

/**
 * Create a session in the database.
 */
export async function createSession(code, creatorId) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ code, creator_id: creatorId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Join a session by code (uses RPC function with security definer).
 */
export async function joinSessionByCode(code) {
  const { data, error } = await supabase.rpc('join_session', { session_code: code })
  if (error) throw new Error('Session introuvable ou déjà complète.')
  return data
}

/**
 * Get the current user's active session.
 */
export async function getMySession() {
  const { data, error } = await supabase.rpc('get_my_session')
  if (error) return null
  return data
}

/**
 * Deactivate a session.
 */
export async function deactivateSession(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .update({ is_active: false })
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

/**
 * Get the partner's username from a session.
 */
export async function getPartnerUsername(session, myId) {
  const partnerId = session.creator_id === myId ? session.partner_id : session.creator_id
  if (!partnerId) return null

  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', partnerId)
    .single()

  return data?.username || null
}
