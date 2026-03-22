import { z } from 'zod'
import { sendPasswordResetEmail } from '../../utils/email'

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
