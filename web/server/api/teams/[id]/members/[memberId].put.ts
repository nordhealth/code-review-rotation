import { z } from 'zod'

const schema = z.object({
  reviewerCount: z.number().int().positive().nullable().optional(),
  isExperienced: z.boolean().optional(),
  preferableReviewerIds: z.array(z.string()).optional(),
})

defineRouteMeta({
  openAPI: {
    summary: 'Update a team member',
    tags: ['Team Members'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Team slug or ID',
        schema: { type: 'string' },
      },
      {
        name: 'memberId',
        in: 'path',
        required: true,
        description: 'Team member ID',
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
              reviewerCount: { type: 'integer', minimum: 1, nullable: true },
              isExperienced: { type: 'boolean' },
              preferableReviewerIds: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'The updated team member',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                teamId: { type: 'string' },
                developerId: { type: 'string' },
                reviewerCount: { type: 'integer', nullable: true },
                isExperienced: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'teamId', 'developerId', 'isExperienced', 'createdAt'],
            },
          },
        },
      },
      404: {
        description: 'Team member not found',
      },
    },
  },
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const memberId = getRouterParam(event, 'memberId')!
  const body = await readValidatedBody(event, schema.parse)

  const { preferableReviewerIds, ...memberData } = body

  // Only update member fields if any were provided (avoid empty SET)
  let member
  if (Object.keys(memberData).length > 0) {
    member = await updateTeamMember(memberId, memberData)
    if (!member) {
      throw createError({ statusCode: 404, statusMessage: 'Team member not found' })
    }
  }
  else {
    member = await queryTeamMemberById(memberId)
    if (!member) {
      throw createError({ statusCode: 404, statusMessage: 'Team member not found' })
    }
  }

  if (preferableReviewerIds !== undefined) {
    await setPreferableReviewers(memberId, preferableReviewerIds)
  }

  return member
})
