import { z } from 'zod'

const schema = z.object({
  reviewerCount: z.number().int().positive().nullable().optional(),
  isExperienced: z.boolean().optional(),
  preferableReviewerIds: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const memberId = getRouterParam(event, 'memberId')!
  const body = await readValidatedBody(event, schema.parse)

  const { preferableReviewerIds, ...memberData } = body

  const member = await updateTeamMember(memberId, memberData)
  if (!member) {
    throw createError({ statusCode: 404, statusMessage: 'Team member not found' })
  }

  if (preferableReviewerIds !== undefined) {
    await setPreferableReviewers(memberId, preferableReviewerIds)
  }

  return member
})
