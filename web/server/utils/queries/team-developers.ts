import { developers, preferableReviewers, teamDevelopers } from '../../db/schema'

export async function queryTeamMembers(teamId: string) {
  const members = await db
    .select({
      id: teamDevelopers.id,
      teamId: teamDevelopers.teamId,
      developerId: teamDevelopers.developerId,
      reviewerCount: teamDevelopers.reviewerCount,
      isExperienced: teamDevelopers.isExperienced,
      developer: {
        id: developers.id,
        firstName: developers.firstName,
        lastName: developers.lastName,
        slug: developers.slug,
        slackId: developers.slackId,
        gitlabId: developers.gitlabId,
      },
    })
    .from(teamDevelopers)
    .innerJoin(developers, eq(teamDevelopers.developerId, developers.id))
    .where(eq(teamDevelopers.teamId, teamId))

  if (members.length === 0)
    return []

  const memberIds = members.map(m => m.id)
  const prefs = await db
    .select({
      id: preferableReviewers.id,
      teamDeveloperId: preferableReviewers.teamDeveloperId,
      preferredDeveloperId: preferableReviewers.preferredDeveloperId,
    })
    .from(preferableReviewers)
    .where(inArray(preferableReviewers.teamDeveloperId, memberIds))

  const prefsByMember = new Map<string, typeof prefs>()
  for (const pref of prefs) {
    const existing = prefsByMember.get(pref.teamDeveloperId) ?? []
    existing.push(pref)
    prefsByMember.set(pref.teamDeveloperId, existing)
  }

  return members.map(m => ({
    ...m,
    preferableReviewers: (prefsByMember.get(m.id) ?? []).map(p => ({
      id: p.id,
      preferredDeveloperId: p.preferredDeveloperId,
    })),
  }))
}

export async function addTeamMember(data: {
  teamId: string
  developerId: string
  reviewerCount?: number
  isExperienced?: boolean
}) {
  const [member] = await db.insert(teamDevelopers).values(data).returning()
  return member
}

export async function updateTeamMember(
  memberId: string,
  data: Partial<{ reviewerCount: number | null, isExperienced: boolean }>,
) {
  const [member] = await db
    .update(teamDevelopers)
    .set(data)
    .where(eq(teamDevelopers.id, memberId))
    .returning()
  return member ?? null
}

export async function removeTeamMember(memberId: string) {
  // preferableReviewers cascade on delete via FK, but delete explicitly for clarity
  await db
    .delete(preferableReviewers)
    .where(eq(preferableReviewers.teamDeveloperId, memberId))
  await db.delete(teamDevelopers).where(eq(teamDevelopers.id, memberId))
}

export async function setPreferableReviewers(
  teamDeveloperId: string,
  preferredDeveloperIds: string[],
) {
  await db
    .delete(preferableReviewers)
    .where(eq(preferableReviewers.teamDeveloperId, teamDeveloperId))

  if (preferredDeveloperIds.length === 0)
    return []

  const rows = await db
    .insert(preferableReviewers)
    .values(preferredDeveloperIds.map(devId => ({ teamDeveloperId, preferredDeveloperId: devId })))
    .returning()

  return rows
}
