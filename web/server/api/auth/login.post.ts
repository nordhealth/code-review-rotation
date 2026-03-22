import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email({ error: 'Invalid email address' }),
  password: z.string().min(1, { error: 'Password is required' }),
})

defineRouteMeta({
  openAPI: {
    summary: 'Sign in with email and password',
    tags: ['Auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      401: { description: 'Invalid email or password' },
      403: { description: 'Email not confirmed' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.parse)

  const user = await queryUserByEmail(body.email)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  const valid = await verifyPassword(user.passwordHash, body.password)
  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password',
    })
  }

  if (!user.emailConfirmed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Please confirm your email before signing in',
    })
  }

  let developerSlug: string | null = null
  if (user.developerId) {
    const developer = await queryDeveloperById(user.developerId)
    developerSlug = developer?.slug ?? null
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      avatarUrl: user.avatarUrl,
      role: user.role as 'admin' | 'developer',
      developerSlug,
    },
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
    },
  }
})
