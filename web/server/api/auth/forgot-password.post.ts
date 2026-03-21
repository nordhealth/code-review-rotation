import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email address'),
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

  // In development, log the reset link
  if (import.meta.dev) {
    const baseUrl = getRequestURL(event).origin
    // eslint-disable-next-line no-console
    console.log(`\n[auth] Password reset link for ${body.email}:`)
    // eslint-disable-next-line no-console
    console.log(`  ${baseUrl}/reset-password?token=${token}\n`)
  }

  return {
    message: successMessage,
    ...(import.meta.dev ? { resetToken: token } : {}),
  }
})
