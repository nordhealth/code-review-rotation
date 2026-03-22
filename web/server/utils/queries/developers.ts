import { aliasedTable } from 'drizzle-orm'
import {
  developers,
  rotationAssignmentReviewers,
  rotationAssignments,
  rotations,
  teamDevelopers,
  teams,
} from '../../db/schema'

export async function queryDevelopers() {
  return db.select().from(developers).orderBy(asc(developers.firstName))
}

export async function queryDeveloperById(id: string) {
  const [developer] = await db.select().from(developers).where(eq(developers.id, id))
  return developer ?? null
}

export async function queryDeveloperBySlug(slug: string) {
  const [developer] = await db.select().from(developers).where(eq(developers.slug, slug))
  return developer ?? null
}

export async function resolveDeveloper(slugOrId: string) {
  const bySlug = await queryDeveloperBySlug(slugOrId)
  if (bySlug)
    return bySlug
  return queryDeveloperById(slugOrId)
}

export async function createDeveloper(data: {
  firstName: string
  lastName: string
  slackId?: string
  gitlabId?: string
  githubId?: string
}) {
  const slug = makeSlug(`${data.firstName} ${data.lastName}`)
  const [developer] = await db
    .insert(developers)
    .values({ ...data, slug })
    .returning()
  return developer
}

export async function updateDeveloper(
  id: string,
  data: Partial<{
    firstName: string
    lastName: string
    slackId: string | null
    gitlabId: string | null
    githubId: string | null
  }>,
) {
  const updates: Partial<typeof developers.$inferInsert> = { ...data, updatedAt: new Date() }
  if (data.firstName || data.lastName) {
    const current = await queryDeveloperById(id)
    if (current) {
      const firstName = data.firstName ?? current.firstName
      const lastName = data.lastName ?? current.lastName
      updates.slug = makeSlug(`${firstName} ${lastName}`)
    }
  }
  const [developer] = await db
    .update(developers)
    .set(updates)
    .where(eq(developers.id, id))
    .returning()
  return developer ?? null
}

export async function deleteDeveloper(id: string) {
  await db.delete(developers).where(eq(developers.id, id))
}

/**
 * Get all rotation associations for a developer:
 * - Who reviews their code (reviewers assigned TO them)
 * - Whose code they review (assignments where they ARE a reviewer)
 */
export async function queryDeveloperAssociations(developerId: string) {
  // 1. Assignments where this developer is the TARGET (who reviews their code)
  const assignedToMe = await db
    .select({
      assignmentId: rotationAssignments.id,
      rotationId: rotationAssignments.rotationId,
      targetName: rotationAssignments.targetName,
      date: rotations.date,
      mode: rotations.mode,
      teamId: rotations.teamId,
      teamName: teams.name,
      teamSlug: teams.slug,
      reviewerId: rotationAssignmentReviewers.reviewerDeveloperId,
      reviewerName: rotationAssignmentReviewers.reviewerName,
      reviewerFirstName: developers.firstName,
      reviewerLastName: developers.lastName,
      reviewerSlug: developers.slug,
    })
    .from(rotationAssignments)
    .innerJoin(rotations, eq(rotationAssignments.rotationId, rotations.id))
    .innerJoin(teams, eq(rotations.teamId, teams.id))
    .innerJoin(
      rotationAssignmentReviewers,
      eq(rotationAssignments.id, rotationAssignmentReviewers.assignmentId),
    )
    .leftJoin(developers, eq(rotationAssignmentReviewers.reviewerDeveloperId, developers.id))
    .where(eq(rotationAssignments.targetId, developerId))
    .orderBy(desc(rotations.date))

  // 2. Assignments where this developer is a REVIEWER (whose code they review)
  const targetDevelopers = aliasedTable(developers, 'targetDevelopers')
  const reviewingOthers = await db
    .select({
      assignmentId: rotationAssignments.id,
      rotationId: rotationAssignments.rotationId,
      targetId: rotationAssignments.targetId,
      targetName: rotationAssignments.targetName,
      targetType: rotationAssignments.targetType,
      targetSlug: targetDevelopers.slug,
      date: rotations.date,
      mode: rotations.mode,
      teamId: rotations.teamId,
      teamName: teams.name,
      teamSlug: teams.slug,
    })
    .from(rotationAssignmentReviewers)
    .innerJoin(
      rotationAssignments,
      eq(rotationAssignmentReviewers.assignmentId, rotationAssignments.id),
    )
    .innerJoin(rotations, eq(rotationAssignments.rotationId, rotations.id))
    .innerJoin(teams, eq(rotations.teamId, teams.id))
    .leftJoin(targetDevelopers, eq(rotationAssignments.targetId, targetDevelopers.id))
    .where(eq(rotationAssignmentReviewers.reviewerDeveloperId, developerId))
    .orderBy(desc(rotations.date))

  // 3. Teams this developer belongs to
  const memberOf = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      teamSlug: teams.slug,
      isExperienced: teamDevelopers.isExperienced,
    })
    .from(teamDevelopers)
    .innerJoin(teams, eq(teamDevelopers.teamId, teams.id))
    .where(eq(teamDevelopers.developerId, developerId))

  return { assignedToMe, reviewingOthers, memberOf }
}
