import { z } from 'zod'
import { sendPasswordResetEmail } from '../../utils/email'

const schema = z.object({
  email: z.string().email({ error: 'Invalid email address' }),
})

defineRouteMeta({
  openAPI: {
    summary: 'Request a password reset email',
    tags: ['Auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string', format: 'email' },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Reset email sent if account exists',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                resetToken: { type: 'string', description: 'Only returned in development mode' },
              },
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)

  // Always return success to avoid user enumeration
  const successMessage
    = 'If an account exists with that email, you will receive a password reset link.'

  const user = await queryUserByEmail(body.email)
  if (!user) {
    return { message: successMessage }
  }

  const token = generateToken()
  await setResetToken(user.id, token, tokenExpiresAt())

  const baseUrl = getRequestURL(event).origin
  const resetUrl = `${baseUrl}/reset-password?token=${token}`
  const name = user.firstName ?? user.email

  sendPasswordResetEmail(user.email, name, resetUrl).catch((emailError) => {
    console.error('[auth] Failed to send password reset email:', emailError)
  })

  return {
    message: successMessage,
    ...(import.meta.dev ? { resetToken: token } : {}),
  }
})
