import { supabase } from './supabase.js'

/**
 * Sign up with username + password.
 * Uses a fake email pattern for Supabase Auth.
 */
export async function signUp(username, password) {
  const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@localyly.app`

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    throw new Error(translateAuthError(error))
  }

  // Check if user was actually created (email confirmation might block)
  if (!data.user) {
    throw new Error('Erreur lors de la création du compte.')
  }

  // Create profile
  const { error: profileErr } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, username })

  if (profileErr) {
    // If profile creation fails (e.g. duplicate username), clean up
    if (profileErr.message.includes('duplicate') || profileErr.message.includes('unique')) {
      throw new Error('Ce nom d\'utilisateur est déjà pris.')
    }
    throw new Error(profileErr.message)
  }

  return data.user
}

/**
 * Sign in with username + password.
 */
export async function signIn(username, password) {
  const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@localyly.app`

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(translateAuthError(error))
  }

  return data.user
}

/**
 * Sign out.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get the current session (if logged in).
 */
export async function getAuthSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/**
 * Get the current user's profile.
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

/**
 * Update the current user's avatar and color.
 */
export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

/**
 * Listen for auth state changes.
 */
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * Translate Supabase auth errors to French.
 */
function translateAuthError(error) {
  const msg = error.message || ''
  const status = error.status || 0

  if (status === 429 || msg.includes('rate limit') || msg.includes('too many'))
    return 'Trop de tentatives. Attends quelques minutes.'
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return 'Ce nom d\'utilisateur est déjà pris.'
  if (msg.includes('Invalid login'))
    return 'Nom d\'utilisateur ou mot de passe incorrect.'
  if (msg.includes('Email not confirmed'))
    return 'Compte non confirmé. Contacte l\'administrateur.'
  if (msg.includes('Password should be'))
    return 'Le mot de passe doit faire au moins 6 caractères.'
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Erreur réseau. Vérifie ta connexion internet.'

  return msg || 'Une erreur est survenue.'
}
