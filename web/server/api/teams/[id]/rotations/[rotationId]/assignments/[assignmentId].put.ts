import { z } from 'zod'

const schema = z.object({
  reviewerDeveloperIds: z.array(z.string()),
})

defineRouteMeta({
  openAPI: {
    summary: 'Update reviewers for a rotation assignment',
    tags: ['Rotations'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Team slug or ID',
        schema: { type: 'string' },
      },
      {
        name: 'rotationId',
        in: 'path',
        required: true,
        description: 'Rotation ID',
        schema: { type: 'string' },
      },
      {
        name: 'assignmentId',
        in: 'path',
        required: true,
        description: 'Assignment ID',
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
              reviewerDeveloperIds: { type: 'array', items: { type: 'string' } },
            },
            required: ['reviewerDeveloperIds'],
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Assignment reviewers updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
              },
              required: ['ok'],
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const assignmentId = getRouterParam(event, 'assignmentId')!
  const body = await readValidatedBody(event, schema.parse)
  await updateAssignmentReviewers(assignmentId, body.reviewerDeveloperIds)
  return { ok: true }
})
