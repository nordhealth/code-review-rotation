/**
 * Generate a random API key with a recognizable prefix.
 * Format: "rl_" + 48 hex chars (24 random bytes).
 */
export function generateApiKey(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  return `rl_${hex}`
}

/**
 * Extract the display prefix from an API key (first 11 chars: "rl_" + 8 hex).
 */
export function extractKeyPrefix(key: string): string {
  return key.slice(0, 11)
}

/**
 * Hash an API key using SHA-256. Returns a hex string.
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
}
