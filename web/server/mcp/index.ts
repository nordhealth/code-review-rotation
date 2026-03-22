import { defineMcpHandler } from '@nuxtjs/mcp-toolkit/server'
import { createError, getHeader } from 'h3'

export default defineMcpHandler({
  name: 'nord-review',
  version: '1.0.0',
  middleware: async (event) => {
    const authorization = getHeader(event, 'authorization')
    if (!authorization?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        message: 'Missing or invalid Authorization header. Use: Bearer <api_key>',
      })
    }

    const key = authorization.slice(7)
    if (!key) {
      throw createError({
        statusCode: 401,
        message: 'API key is empty',
      })
    }

    const user = await resolveApiKeyUser(key)
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Invalid API key',
      })
    }

    event.context.user = user
  },
})
