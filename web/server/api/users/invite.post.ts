import { z } from 'zod'
import { sendInviteEmail } from '../../utils/email'

const schema = z.object({
  email: z.string().email(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Invite a user by email',
    tags: ['Users'],
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
        description: 'Invitation sent',
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
      400: { description: 'Email domain not allowed' },
      401: { description: 'Unauthorized' },
      403: { description: 'Admin access required' },
      409: { description: 'Account already exists' },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, schema.parse)

  if (!isAllowedEmail(body.email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only @nordhealth.com and @provet.com emails are allowed',
    })
  }

  const existing = await queryUserByEmail(body.email)
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'An account with this email already exists',
    })
  }

  const baseUrl = getRequestURL(event).origin
  const registerUrl = `${baseUrl}/register?email=${encodeURIComponent(body.email)}`

  sendInviteEmail(body.email, registerUrl).catch((emailError) => {
    console.error('[auth] Failed to send invite email:', emailError)
  })

  return { message: `Invitation sent to ${body.email}` }
})
