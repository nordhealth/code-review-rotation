import {
  developers,
  rotationAssignmentReviewers,
  rotationAssignments,
  rotations,
  squads,
  teams,
} from '../../db/schema'
import { fireWebhooks } from '../queries/webhooks'

export async function queryRotations(
  teamId: string,
  options: { limit?: number, offset?: number } = {},
) {
  const { limit = 20, offset = 0 } = options

  const teamRotations = await db
    .select()
    .from(rotations)
    .where(eq(rotations.teamId, teamId))
    .orderBy(desc(rotations.date), desc(rotations.createdAt))
    .limit(limit)
    .offset(offset)

  if (teamRotations.length === 0)
    return []

  const rotationIds = teamRotations.map(r => r.id)

  const assignments = await db
    .select()
    .from(rotationAssignments)
    .where(inArray(rotationAssignments.rotationId, rotationIds))

  if (assignments.length === 0) {
    return teamRotations.map(r => ({ ...r, assignments: [] }))
  }

  // Resolve target names (developer or squad)
  const devTargetIds = assignments
    .filter(a => a.targetType === 'developer')
    .map(a => a.targetId)
  const squadTargetIds = assignments.filter(a => a.targetType === 'squad').map(a => a.targetId)

  const targetNameMap = new Map<string, string>()
  const targetSlugMap = new Map<string, string>()

  if (devTargetIds.length > 0) {
    const devRows = await db
      .select({
        id: developers.id,
        firstName: developers.firstName,
        lastName: developers.lastName,
        slug: developers.slug,
      })
      .from(developers)
      .where(inArray(developers.id, devTargetIds))
    for (const d of devRows) {
      targetNameMap.set(d.id, `${d.firstName} ${d.lastName}`)
      targetSlugMap.set(d.id, d.slug)
    }
  }

  if (squadTargetIds.length > 0) {
    const squadRows = await db
      .select({ id: squads.id, name: squads.name })
      .from(squads)
      .where(inArray(squads.id, squadTargetIds))
    for (const s of squadRows) {
      targetNameMap.set(s.id, s.name)
    }
  }

  const assignmentIds = assignments.map(a => a.id)

  const reviewerRows = await db
    .select({
      id: rotationAssignmentReviewers.id,
      assignmentId: rotationAssignmentReviewers.assignmentId,
      reviewerDeveloperId: rotationAssignmentReviewers.reviewerDeveloperId,
      reviewerName: rotationAssignmentReviewers.reviewerName,
      developer: {
        id: developers.id,
        firstName: developers.firstName,
        lastName: developers.lastName,
        slug: developers.slug,
        slackId: developers.slackId,
        gitlabId: developers.gitlabId,
      },
    })
    .from(rotationAssignmentReviewers)
    .leftJoin(developers, eq(rotationAssignmentReviewers.reviewerDeveloperId, developers.id))
    .where(inArray(rotationAssignmentReviewers.assignmentId, assignmentIds))

  const reviewers = reviewerRows.map(r => ({
    ...r,
    developer: r.developer.id
      ? r.developer
      : {
          id: r.reviewerDeveloperId,
          firstName: r.reviewerName ?? 'Deleted',
          lastName: '',
          slug: null,
          slackId: null,
          gitlabId: null,
        },
  }))

  const reviewersByAssignment = new Map<string, typeof reviewers>()
  for (const r of reviewers) {
    const existing = reviewersByAssignment.get(r.assignmentId) ?? []
    existing.push(r)
    reviewersByAssignment.set(r.assignmentId, existing)
  }

  const assignmentsByRotation = new Map<
    string,
    ((typeof assignments)[number] & { targetName: string, reviewers: typeof reviewers })[]
  >()
  for (const a of assignments) {
    const existing = assignmentsByRotation.get(a.rotationId) ?? []
    existing.push({
      ...a,
      targetName: targetNameMap.get(a.targetId) ?? a.targetName ?? a.targetId,
      targetSlug: targetSlugMap.get(a.targetId) ?? null,
      reviewers: reviewersByAssignment.get(a.id) ?? [],
    })
    assignmentsByRotation.set(a.rotationId, existing)
  }

  return teamRotations.map(r => ({
    ...r,
    assignments: assignmentsByRotation.get(r.id) ?? [],
  }))
}

export async function updateAssignmentReviewers(
  assignmentId: string,
  reviewerDeveloperIds: string[],
) {
  await db
    .delete(rotationAssignmentReviewers)
    .where(eq(rotationAssignmentReviewers.assignmentId, assignmentId))

  if (reviewerDeveloperIds.length > 0) {
    const devRows = await db
      .select({ id: developers.id, firstName: developers.firstName, lastName: developers.lastName })
      .from(developers)
      .where(inArray(developers.id, reviewerDeveloperIds))
    const nameMap = new Map(devRows.map(d => [d.id, `${d.firstName} ${d.lastName}`]))

    await db.insert(rotationAssignmentReviewers).values(
      reviewerDeveloperIds.map(devId => ({
        assignmentId,
        reviewerDeveloperId: devId,
        reviewerName: nameMap.get(devId) ?? null,
      })),
    )
  }
}

export async function createRotation(data: {
  teamId: string
  date: Date
  isManual: boolean
  mode: 'devs' | 'teams'
  assignments: {
    targetType: 'developer' | 'squad'
    targetId: string
    targetName?: string
    reviewerDeveloperIds: string[]
  }[]
}) {
  const [rotation] = await db
    .insert(rotations)
    .values({
      teamId: data.teamId,
      date: data.date,
      isManual: data.isManual,
      mode: data.mode,
    })
    .returning()

  // Resolve names for all targets and reviewers upfront
  const allDevIds = new Set<string>()
  const allSquadIds = new Set<string>()
  for (const a of data.assignments) {
    if (a.targetType === 'developer')
      allDevIds.add(a.targetId)
    if (a.targetType === 'squad')
      allSquadIds.add(a.targetId)
    for (const devId of a.reviewerDeveloperIds) allDevIds.add(devId)
  }

  const devNameMap = new Map<string, string>()
  const devDetailMap = new Map<
    string,
    { firstName: string, lastName: string, slackId: string | null, gitlabId: string | null }
  >()
  if (allDevIds.size > 0) {
    const devRows = await db
      .select({
        id: developers.id,
        firstName: developers.firstName,
        lastName: developers.lastName,
        slackId: developers.slackId,
        gitlabId: developers.gitlabId,
      })
      .from(developers)
      .where(inArray(developers.id, [...allDevIds]))
    for (const d of devRows) {
      devNameMap.set(d.id, `${d.firstName} ${d.lastName}`)
      devDetailMap.set(d.id, d)
    }
  }

  const squadNameMap = new Map<string, string>()
  if (allSquadIds.size > 0) {
    const squadRows = await db
      .select({ id: squads.id, name: squads.name })
      .from(squads)
      .where(inArray(squads.id, [...allSquadIds]))
    for (const s of squadRows) squadNameMap.set(s.id, s.name)
  }

  for (const assignment of data.assignments) {
    const targetName
      = assignment.targetName
        ?? (assignment.targetType === 'developer'
          ? devNameMap.get(assignment.targetId)
          : squadNameMap.get(assignment.targetId))
        ?? null

    const [inserted] = await db
      .insert(rotationAssignments)
      .values({
        rotationId: rotation.id,
        targetType: assignment.targetType,
        targetId: assignment.targetId,
        targetName,
      })
      .returning()

    if (assignment.reviewerDeveloperIds.length > 0) {
      await db.insert(rotationAssignmentReviewers).values(
        assignment.reviewerDeveloperIds.map(devId => ({
          assignmentId: inserted.id,
          reviewerDeveloperId: devId,
          reviewerName: devNameMap.get(devId) ?? null,
        })),
      )
    }
  }

  // Fire webhooks in the background (don't block the response)
  const teamRow = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, data.teamId))
    .then(rows => rows[0])

  fireWebhooks('rotation.created', {
    rotationId: rotation.id,
    teamId: data.teamId,
    teamName: teamRow?.name ?? data.teamId,
    date: data.date.toISOString(),
    mode: data.mode,
    isManual: data.isManual,
    assignments: data.assignments.map((assignment) => {
      return {
        targetType: assignment.targetType,
        targetId: assignment.targetId,
        targetName:
          assignment.targetName
          ?? (assignment.targetType === 'developer'
            ? devNameMap.get(assignment.targetId)
            : squadNameMap.get(assignment.targetId))
          ?? null,
        reviewers: assignment.reviewerDeveloperIds.map((devId) => {
          const reviewerDetail = devDetailMap.get(devId)
          return {
            id: devId,
            name: devNameMap.get(devId) ?? null,
            slackId: reviewerDetail?.slackId ?? null,
            gitlabId: reviewerDetail?.gitlabId ?? null,
          }
        }),
      }
    }),
  }).catch((webhookError) => {
    console.error('[webhook] Error firing rotation.created webhooks:', webhookError)
  })

  return rotation
}

export async function queryLastSquadRotationDate(
  teamId: string,
  squadId: string,
): Promise<Date | null> {
  const [result] = await db
    .select({ date: rotations.date })
    .from(rotations)
    .innerJoin(rotationAssignments, eq(rotationAssignments.rotationId, rotations.id))
    .where(
      and(
        eq(rotations.teamId, teamId),
        eq(rotations.mode, 'teams'),
        eq(rotationAssignments.targetType, 'squad'),
        eq(rotationAssignments.targetId, squadId),
      ),
    )
    .orderBy(desc(rotations.date))
    .limit(1)
  return result?.date ?? null
}

export async function queryLatestRotations() {
  const latestPerTeamMode = db
    .select({
      teamId: rotations.teamId,
      mode: rotations.mode,
      maxDate: sql<number>`max(${rotations.date})`.as('max_date'),
    })
    .from(rotations)
    .groupBy(rotations.teamId, rotations.mode)
    .as('latest')

  const latestRotations = await db
    .select({
      id: rotations.id,
      teamId: rotations.teamId,
      date: rotations.date,
      isManual: rotations.isManual,
      mode: rotations.mode,
      createdAt: rotations.createdAt,
    })
    .from(rotations)
    .innerJoin(
      latestPerTeamMode,
      sql`${rotations.teamId} = ${latestPerTeamMode.teamId} and ${rotations.mode} = ${latestPerTeamMode.mode} and ${rotations.date} = ${latestPerTeamMode.maxDate}`,
    )

  if (latestRotations.length === 0)
    return []

  const rotationIds = latestRotations.map(r => r.id)

  const assignments = await db
    .select()
    .from(rotationAssignments)
    .where(inArray(rotationAssignments.rotationId, rotationIds))

  // Resolve target names
  const devTargetIds = assignments
    .filter(a => a.targetType === 'developer')
    .map(a => a.targetId)
  const squadTargetIds = assignments.filter(a => a.targetType === 'squad').map(a => a.targetId)

  const targetNameMap = new Map<string, string>()
  const targetSlugMap = new Map<string, string>()

  if (devTargetIds.length > 0) {
    const devRows = await db
      .select({
        id: developers.id,
        firstName: developers.firstName,
        lastName: developers.lastName,
        slug: developers.slug,
      })
      .from(developers)
      .where(inArray(developers.id, devTargetIds))
    for (const d of devRows) {
      targetNameMap.set(d.id, `${d.firstName} ${d.lastName}`)
      targetSlugMap.set(d.id, d.slug)
    }
  }

  if (squadTargetIds.length > 0) {
    const squadRows = await db
      .select({ id: squads.id, name: squads.name })
      .from(squads)
      .where(inArray(squads.id, squadTargetIds))
    for (const s of squadRows) {
      targetNameMap.set(s.id, s.name)
    }
  }

  const assignmentIds = assignments.map(a => a.id)

  const reviewerRows
    = assignmentIds.length > 0
      ? await db
          .select({
            id: rotationAssignmentReviewers.id,
            assignmentId: rotationAssignmentReviewers.assignmentId,
            reviewerDeveloperId: rotationAssignmentReviewers.reviewerDeveloperId,
            reviewerName: rotationAssignmentReviewers.reviewerName,
            developer: {
              id: developers.id,
              firstName: developers.firstName,
              lastName: developers.lastName,
              slug: developers.slug,
              slackId: developers.slackId,
              gitlabId: developers.gitlabId,
            },
          })
          .from(rotationAssignmentReviewers)
          .leftJoin(developers, eq(rotationAssignmentReviewers.reviewerDeveloperId, developers.id))
          .where(inArray(rotationAssignmentReviewers.assignmentId, assignmentIds))
      : []

  const reviewers = reviewerRows.map(r => ({
    ...r,
    developer: r.developer.id
      ? r.developer
      : {
          id: r.reviewerDeveloperId,
          firstName: r.reviewerName ?? 'Deleted',
          lastName: '',
          slug: null,
          slackId: null,
          gitlabId: null,
        },
  }))

  const reviewersByAssignment = new Map<string, typeof reviewers>()
  for (const r of reviewers) {
    const existing = reviewersByAssignment.get(r.assignmentId) ?? []
    existing.push(r)
    reviewersByAssignment.set(r.assignmentId, existing)
  }

  const assignmentsByRotation = new Map<
    string,
    ((typeof assignments)[number] & { targetName: string, reviewers: typeof reviewers })[]
  >()
  for (const a of assignments) {
    const existing = assignmentsByRotation.get(a.rotationId) ?? []
    existing.push({
      ...a,
      targetName: targetNameMap.get(a.targetId) ?? a.targetName ?? a.targetId,
      targetSlug: targetSlugMap.get(a.targetId) ?? null,
      reviewers: reviewersByAssignment.get(a.id) ?? [],
    })
    assignmentsByRotation.set(a.rotationId, existing)
  }

  return latestRotations.map(r => ({
    ...r,
    assignments: assignmentsByRotation.get(r.id) ?? [],
  }))
}
