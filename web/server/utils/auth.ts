import type { H3Event } from 'h3'

export async function requireAuth(event: H3Event) {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }
  return session.user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireAuth(event)
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required',
    })
  }
  return user
}

/**
 * Authenticate via Bearer token (API key).
 * Returns the user associated with the key, or throws 401.
 */
export async function requireApiKey(event: H3Event) {
  const authorization = getHeader(event, 'authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing or invalid Authorization header. Use: Bearer <api_key>',
    })
  }

  const key = authorization.slice(7)
  if (!key) {
    throw createError({
      statusCode: 401,
      statusMessage: 'API key is empty',
    })
  }

  const user = await resolveApiKeyUser(key)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid API key',
    })
  }

  return user
}
