import { z } from 'zod'

const linkDeveloperSchema = z.object({
  developerId: z.string().min(1, { error: 'Developer ID is required' }),
})

defineRouteMeta({
  openAPI: {
    summary: 'Link user account to a developer profile',
    tags: ['Developers'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['developerId'],
            properties: {
              developerId: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Developer linked successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                developerSlug: { type: 'string' },
              },
            },
          },
        },
      },
      400: { description: 'Invalid developer ID' },
      401: { description: 'Unauthorized' },
      404: { description: 'Developer not found' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, linkDeveloperSchema.parse)

  const developer = await queryDeveloperById(body.developerId)
  if (!developer) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Developer not found',
    })
  }

  await updateUserDeveloperId(user.id, body.developerId)

  await setUserSession(event, {
    user: {
      ...user,
      developerSlug: developer.slug,
    },
  })

  return { developerSlug: developer.slug }
})
