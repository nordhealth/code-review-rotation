import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  slackId: z.string().optional(),
  gitlabId: z.string().optional(),
  githubId: z.string().optional(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Create a new developer',
    tags: ['Developers'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              firstName: { type: 'string', minLength: 1 },
              lastName: { type: 'string', minLength: 1 },
              slackId: { type: 'string' },
              gitlabId: { type: 'string' },
              githubId: { type: 'string' },
            },
            required: ['firstName', 'lastName'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'The created developer',
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
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, schema.parse)
  return createDeveloper(body)
})
