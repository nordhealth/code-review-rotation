import { teamDevelopers, teams } from '../../db/schema'

const NON_WORD_REGEX = /[^\w\s-]/g
const WHITESPACE_UNDERSCORE_REGEX = /[\s_]+/g
const MULTIPLE_DASH_REGEX = /-+/g

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(NON_WORD_REGEX, '')
    .replace(WHITESPACE_UNDERSCORE_REGEX, '-')
    .replace(MULTIPLE_DASH_REGEX, '-')
}

export async function queryTeams() {
  const memberCountSq = db
    .select({
      teamId: teamDevelopers.teamId,
      count: sql<number>`count(*)`.as('member_count'),
    })
    .from(teamDevelopers)
    .groupBy(teamDevelopers.teamId)
    .as('member_count_sq')

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      defaultReviewerCount: teams.defaultReviewerCount,
      rotationIntervalDays: teams.rotationIntervalDays,
      rotationDay: teams.rotationDay,
      rotationTimezone: teams.rotationTimezone,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      memberCount: sql<number>`coalesce(${memberCountSq.count}, 0)`,
    })
    .from(teams)
    .leftJoin(memberCountSq, eq(teams.id, memberCountSq.teamId))
    .orderBy(asc(teams.name))

  return rows
}

export async function queryTeamById(id: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, id))
  return team ?? null
}

export async function queryTeamBySlug(slug: string) {
  const [team] = await db.select().from(teams).where(eq(teams.slug, slug))
  return team ?? null
}

/**
 * Resolve a team by slug or ID (slug takes priority).
 */
export async function resolveTeam(slugOrId: string) {
  const bySlug = await queryTeamBySlug(slugOrId)
  if (bySlug)
    return bySlug
  return queryTeamById(slugOrId)
}

export async function createTeam(data: {
  name: string
  defaultReviewerCount?: number
  rotationIntervalDays?: number | null
  rotationDay?: string | null
  rotationTimezone?: string | null
}) {
  const slug = slugify(data.name)
  const [team] = await db
    .insert(teams)
    .values({ ...data, slug })
    .returning()
  return team
}

export async function updateTeam(
  id: string,
  data: Partial<{
    name: string
    defaultReviewerCount: number
    rotationIntervalDays: number | null
    rotationDay: string | null
    rotationTimezone: string | null
  }>,
) {
  const updates: Partial<typeof teams.$inferInsert> = { ...data, updatedAt: new Date() }
  if (data.name) {
    updates.slug = slugify(data.name)
  }
  const [team] = await db.update(teams).set(updates).where(eq(teams.id, id)).returning()
  return team ?? null
}

export async function deleteTeam(id: string) {
  await db.delete(teams).where(eq(teams.id, id))
}
