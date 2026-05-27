/**
 * Web Crypto API wrapper for End-to-End Encryption (E2EE)
 */

// Derive a cryptographic key from a simple string (session code)
export async function deriveKey(code) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(code),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('LocaLyly_SuperSecureSalt_v2_2026!@#'),
      iterations: 250000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Encrypt a payload object
export async function encryptPayload(payloadObj, key) {
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = enc.encode(JSON.stringify(payloadObj))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  // Convert IV and encrypted data to base64 for safe transport
  const ivBase64 = btoa(String.fromCharCode(...iv))
  const dataBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)))

  return `${ivBase64}.${dataBase64}`
}

// Decrypt a payload string back to an object
export async function decryptPayload(encryptedString, key) {
  try {
    const [ivBase64, dataBase64] = encryptedString.split('.')
    if (!ivBase64 || !dataBase64) throw new Error('Invalid encrypted format')

    const ivStr = atob(ivBase64)
    const iv = new Uint8Array(ivStr.length)
    for (let i = 0; i < ivStr.length; i++) iv[i] = ivStr.charCodeAt(i)

    const dataStr = atob(dataBase64)
    const data = new Uint8Array(dataStr.length)
    for (let i = 0; i < dataStr.length; i++) data[i] = dataStr.charCodeAt(i)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )

    const dec = new TextDecoder()
    return JSON.parse(dec.decode(decrypted))
  } catch (err) {
    console.error('Decryption failed:', err)
    return null
  }
}
