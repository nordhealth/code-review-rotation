import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  slackId: z.string().nullable().optional(),
  gitlabId: z.string().nullable().optional(),
  githubId: z.string().nullable().optional(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Update a developer by ID or slug',
    tags: ['Developers'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Developer ID or slug',
        schema: { type: 'string' },
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              firstName: { type: 'string', minLength: 1 },
              lastName: { type: 'string', minLength: 1 },
              slackId: { type: 'string', nullable: true },
              gitlabId: { type: 'string', nullable: true },
              githubId: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'The updated developer',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                slug: { type: 'string' },
                slackId: { type: 'string', nullable: true },
                gitlabId: { type: 'string', nullable: true },
                githubId: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'firstName', 'lastName', 'slug', 'createdAt', 'updatedAt'],
            },
          },
        },
      },
      404: {
        description: 'Developer not found',
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const slugOrId = getRouterParam(event, 'id')!
  const existing = await resolveDeveloper(slugOrId)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Developer not found' })
  }
  const body = await readValidatedBody(event, schema.parse)
  const developer = await updateDeveloper(existing.id, body)
  if (!developer) {
    throw createError({ statusCode: 404, statusMessage: 'Developer not found' })
  }
  return developer
})
