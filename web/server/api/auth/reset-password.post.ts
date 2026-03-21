import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)

  const user = await queryUserByResetToken(body.token)
  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or expired reset token',
    })
  }

  if (user.resetPasswordTokenExpiresAt && new Date() > user.resetPasswordTokenExpiresAt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Reset token has expired. Please request a new one.',
    })
  }

  const newHash = await hashPassword(body.password)
  await updateUserPassword(user.id, newHash)

  return { message: 'Password updated successfully. You can now sign in.' }
})
