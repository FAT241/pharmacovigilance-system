// The retry token survives drawer remounts and page reloads within this Electron session.
// Keep only a digest of the request in storage, never the doctor's explanation.
export async function confirmationKey(doctorId: string, itemId: string, checkId: string, reason: string) {
  const bytes = new TextEncoder().encode(JSON.stringify([doctorId, itemId, checkId, reason.trim()]))
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const slot = 'dacs4:confirm:' + Array.from(digest, b => b.toString(16).padStart(2, '0')).join('')
  const previous = sessionStorage.getItem(slot)
  if (previous) return previous
  const key = crypto.randomUUID()
  sessionStorage.setItem(slot, key)
  return key
}
