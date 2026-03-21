export const ALLOWED_DOMAINS = ['nordhealth.com', 'provet.com'] as const
export type AllowedDomain = (typeof ALLOWED_DOMAINS)[number]

export const TOKEN_EXPIRY_HOURS = 24

export function isAllowedEmail(email: string): boolean {
  const atIndex = email.indexOf('@')
  if (atIndex < 1)
    return false
  const domain = email.slice(atIndex + 1)
  return (ALLOWED_DOMAINS as readonly string[]).includes(domain)
}

export function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export function tokenExpiresAt(hours = TOKEN_EXPIRY_HOURS): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}
