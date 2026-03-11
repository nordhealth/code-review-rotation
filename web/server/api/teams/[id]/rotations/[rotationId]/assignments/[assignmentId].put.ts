import { z } from 'zod'

const schema = z.object({
  reviewerDeveloperIds: z.array(z.string()),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const assignmentId = getRouterParam(event, 'assignmentId')!
  const body = await readValidatedBody(event, schema.parse)
  await updateAssignmentReviewers(assignmentId, body.reviewerDeveloperIds)
  return { ok: true }
})
