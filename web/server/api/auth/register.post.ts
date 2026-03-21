import { z } from 'zod'

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

  // In development, log the confirmation link
  if (import.meta.dev) {
    const baseUrl = getRequestURL(event).origin
    // eslint-disable-next-line no-console
    console.log(`\n[auth] Confirmation link for ${body.email}:`)
    // eslint-disable-next-line no-console
    console.log(`  ${baseUrl}/confirm?token=${token}\n`)
  }

  return {
    message: 'Account created. Please check your email to confirm your account.',
    // Only expose token in development for testing
    ...(import.meta.dev ? { confirmationToken: token } : {}),
  }
})
