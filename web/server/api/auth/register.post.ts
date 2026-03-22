import { z } from 'zod'
import { sendConfirmationEmail } from '../../utils/email'

const registerSchema = z.object({
  email: z.string().email({ error: 'Invalid email address' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
  firstName: z.string().min(1, { error: 'First name is required' }),
  lastName: z.string().min(1, { error: 'Last name is required' }),
})

defineRouteMeta({
  openAPI: {
    summary: 'Register a new user account',
    tags: ['Auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password', 'firstName', 'lastName'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              firstName: { type: 'string', minLength: 1 },
              lastName: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Account created, confirmation email sent',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                confirmationToken: { type: 'string', description: 'Only returned in development mode' },
              },
            },
          },
        },
      },
      400: { description: 'Email domain not allowed' },
      409: { description: 'Account already exists' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, registerSchema.parse)

  if (!isAllowedEmail(body.email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only @nordhealth.com and @provet.com emails are allowed',
    })
  }

  const existingUser = await queryUserByEmail(body.email)
  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'An account with this email already exists',
    })
  }

  const passwordHash = await hashPassword(body.password)
  const token = generateToken()

  await createUser({
    email: body.email,
    passwordHash,
    firstName: body.firstName,
    lastName: body.lastName,
    confirmationToken: token,
    confirmationTokenExpiresAt: tokenExpiresAt(),
  })

  const baseUrl = getRequestURL(event).origin
  const confirmUrl = `${baseUrl}/confirm?token=${token}`

  sendConfirmationEmail(body.email, body.firstName, confirmUrl).catch((emailError) => {
    console.error('[auth] Failed to send confirmation email:', emailError)
  })

  return {
    message: 'Account created. Please check your email to confirm your account.',
    // Only expose token in development for testing
    ...(import.meta.dev ? { confirmationToken: token } : {}),
  }
})
