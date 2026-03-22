import { z } from 'zod'

const confirmSchema = z.object({
  token: z.string().min(1, { error: 'Confirmation token is required' }),
})

defineRouteMeta({
  openAPI: {
    summary: 'Confirm email address with token',
    tags: ['Auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['token'],
            properties: {
              token: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Email confirmed',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
      400: { description: 'Invalid or expired confirmation token' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, confirmSchema.parse)

  const user = await queryUserByConfirmationToken(body.token)
  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or expired confirmation token',
    })
  }

  if (user.emailConfirmed) {
    return { message: 'Email already confirmed' }
  }

  if (user.confirmationTokenExpiresAt && new Date() > user.confirmationTokenExpiresAt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Confirmation token has expired. Please register again.',
    })
  }

  await confirmUser(user.id)

  return { message: 'Email confirmed successfully. You can now sign in.' }
})
