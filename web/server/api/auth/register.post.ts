import { z } from 'zod'
import { sendConfirmationEmail } from '../../utils/email'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
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
