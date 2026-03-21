import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export default defineEventHandler(async (event) => {
  const sessionUser = await requireAuth(event)
  const body = await readValidatedBody(event, schema.parse)

  const user = await queryUserByEmail(sessionUser.email)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const valid = await verifyPassword(user.passwordHash, body.currentPassword)
  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Current password is incorrect',
    })
  }

  const newHash = await hashPassword(body.newPassword)
  await updateUserPassword(user.id, newHash)

  return { message: 'Password changed successfully' }
})
