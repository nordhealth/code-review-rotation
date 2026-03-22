import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  slackId: z.string().nullable().optional(),
  gitlabId: z.string().nullable().optional(),
  githubId: z.string().nullable().optional(),
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
