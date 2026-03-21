import type { RotationDeveloper } from './developers'
import type { RotationSquad, TeamRotationContext } from './teams'
import {
  developers,
  preferableReviewers,
  rotationAssignmentReviewers,
  rotationAssignments,
  rotations,
  squadMembers,
  squads,
  teamDevelopers,
  teams,
} from '../../db/schema'
import { runDevRotation } from './developers'
import { runTeamRotation } from './teams'

/**
 * Load the most recent 'devs' rotation for a team and return a map of
 * developer ID → set of reviewer IDs. Used to avoid repeating the same
 * reviewer assignments in consecutive rotations.
 */
async function loadPreviousDevAssignments(
  teamId: string,
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>()

  // Find the most recent devs rotation for this team
  const [lastRotation] = await db
    .select({ id: rotations.id })
    .from(rotations)
    .where(eq(rotations.teamId, teamId))
    .orderBy(desc(rotations.date))
    .limit(1)

  if (!lastRotation)
    return result

  // Load its assignments (only developer type)
  const assigns = await db
    .select({
      targetId: rotationAssignments.targetId,
      assignmentId: rotationAssignments.id,
    })
    .from(rotationAssignments)
    .where(eq(rotationAssignments.rotationId, lastRotation.id))

  if (assigns.length === 0)
    return result

  const assignmentIds = assigns.map(a => a.assignmentId)

  const reviewers = await db
    .select({
      assignmentId: rotationAssignmentReviewers.assignmentId,
      reviewerDeveloperId: rotationAssignmentReviewers.reviewerDeveloperId,
    })
    .from(rotationAssignmentReviewers)
    .where(inArray(rotationAssignmentReviewers.assignmentId, assignmentIds))

  // Build map: target developer ID → set of reviewer developer IDs
  const assignmentToTarget = new Map<string, string>()
  for (const a of assigns) {
    assignmentToTarget.set(a.assignmentId, a.targetId)
  }

  for (const r of reviewers) {
    const targetId = assignmentToTarget.get(r.assignmentId)
    if (!targetId)
      continue
    const existing = result.get(targetId) ?? new Set()
    existing.add(r.reviewerDeveloperId)
    result.set(targetId, existing)
  }

  return result
}

/**
 * Load the most recent 'teams' rotation for a team and return a map of
 * squad ID → set of reviewer IDs.
 */
async function loadPreviousTeamAssignments(
  teamId: string,
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>()

  const [lastRotation] = await db
    .select({ id: rotations.id })
    .from(rotations)
    .where(eq(rotations.teamId, teamId))
    .orderBy(desc(rotations.date))
    .limit(1)

  if (!lastRotation)
    return result

  const assigns = await db
    .select({
      targetId: rotationAssignments.targetId,
      assignmentId: rotationAssignments.id,
    })
    .from(rotationAssignments)
    .where(eq(rotationAssignments.rotationId, lastRotation.id))

  if (assigns.length === 0)
    return result

  const assignmentIds = assigns.map(a => a.assignmentId)

  const reviewers = await db
    .select({
      assignmentId: rotationAssignmentReviewers.assignmentId,
      reviewerDeveloperId: rotationAssignmentReviewers.reviewerDeveloperId,
    })
    .from(rotationAssignmentReviewers)
    .where(inArray(rotationAssignmentReviewers.assignmentId, assignmentIds))

  const assignmentToTarget = new Map<string, string>()
  for (const a of assigns) {
    assignmentToTarget.set(a.assignmentId, a.targetId)
  }

  for (const r of reviewers) {
    const targetId = assignmentToTarget.get(r.assignmentId)
    if (!targetId)
      continue
    const existing = result.get(targetId) ?? new Set()
    existing.add(r.reviewerDeveloperId)
    result.set(targetId, existing)
  }

  return result
}

/**
 * Execute developer rotation for a given team.
 *
 * Loads team members, their config (reviewer count, experience, preferable reviewers)
 * from the database, runs the rotation algorithm, and returns assignments.
 */
export async function executeDevRotation(
  teamId: string,
): Promise<{ targetId: string, reviewerIds: string[] }[]> {
  // Load team members with their developer info
  const members = await db
    .select({
      id: teamDevelopers.id,
      developerId: teamDevelopers.developerId,
      reviewerCount: teamDevelopers.reviewerCount,
      isExperienced: teamDevelopers.isExperienced,
      firstName: developers.firstName,
      lastName: developers.lastName,
    })
    .from(teamDevelopers)
    .innerJoin(developers, eq(teamDevelopers.developerId, developers.id))
    .where(eq(teamDevelopers.teamId, teamId))

  if (members.length === 0)
    return []

  // Load the team's default reviewer count
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId))
  if (!team)
    return []

  // Load preferable reviewers for all team members
  const memberIds = members.map(m => m.id)
  const prefs = await db
    .select({
      teamDeveloperId: preferableReviewers.teamDeveloperId,
      preferredDeveloperId: preferableReviewers.preferredDeveloperId,
    })
    .from(preferableReviewers)
    .where(inArray(preferableReviewers.teamDeveloperId, memberIds))

  // Group preferable reviewers by team developer ID
  const prefsByMember = new Map<string, Set<string>>()
  for (const pref of prefs) {
    const existing = prefsByMember.get(pref.teamDeveloperId) ?? new Set()
    existing.add(pref.preferredDeveloperId)
    prefsByMember.set(pref.teamDeveloperId, existing)
  }

  // Build RotationDeveloper[] - use developer IDs as the rotation ID
  const unexperiencedIds = new Set<string>()
  const rotationDevs: RotationDeveloper[] = members.map((m) => {
    if (!m.isExperienced) {
      unexperiencedIds.add(m.developerId)
    }

    return {
      id: m.developerId,
      name: `${m.firstName} ${m.lastName}`,
      reviewerCount: m.reviewerCount ?? team.defaultReviewerCount,
      isExperienced: m.isExperienced,
      preferableReviewerIds: prefsByMember.get(m.id) ?? new Set(),
      assignedReviewerIds: new Set<string>(),
      reviewingFor: new Set<string>(),
    }
  })

  // Load previous rotation to avoid repeating same reviewer sets
  let previousAssignments: Map<string, Set<string>> | undefined
  try {
    previousAssignments = await loadPreviousDevAssignments(teamId)
  }
  catch (err) {
    console.warn('[rotation] Failed to load previous dev assignments, continuing without:', err)
  }

  // Run rotation algorithm
  const assignments = runDevRotation(rotationDevs, unexperiencedIds, previousAssignments)

  // Convert to output format: targetId is the developer ID
  return Array.from(assignments.entries(), ([devId, reviewerIds]) => ({
    targetId: devId,
    reviewerIds,
  }))
}

/**
 * Execute team (squad) rotation for a given team.
 *
 * Loads squads and their members from the database, builds the rotation context,
 * runs the algorithm, and returns assignments.
 */
export async function executeTeamRotation(
  teamId: string,
): Promise<{ targetId: string, reviewerIds: string[] }[]> {
  // Load all squads for this team
  const teamSquads = await db.select().from(squads).where(eq(squads.teamId, teamId))

  if (teamSquads.length === 0)
    return []

  // Load squad members
  const squadIds = teamSquads.map(s => s.id)
  const members = await db
    .select({
      squadId: squadMembers.squadId,
      developerId: squadMembers.developerId,
    })
    .from(squadMembers)
    .where(inArray(squadMembers.squadId, squadIds))

  // Group members by squad
  const membersBySquad = new Map<string, string[]>()
  for (const m of members) {
    const existing = membersBySquad.get(m.squadId) ?? []
    existing.push(m.developerId)
    membersBySquad.set(m.squadId, existing)
  }

  // Load all team developers to identify experienced ones
  const teamMembers = await db
    .select({
      developerId: teamDevelopers.developerId,
      isExperienced: teamDevelopers.isExperienced,
    })
    .from(teamDevelopers)
    .where(eq(teamDevelopers.teamId, teamId))

  const allDeveloperIds = teamMembers.map(m => m.developerId)
  const experiencedDeveloperIds = teamMembers
    .filter(m => m.isExperienced)
    .map(m => m.developerId)

  // Build RotationSquad[]
  const rotationSquads: RotationSquad[] = teamSquads.map(s => ({
    id: s.id,
    name: s.name,
    reviewerCount: s.reviewerCount,
    memberIds: membersBySquad.get(s.id) ?? [],
  }))

  // Load previous team rotation to avoid repeating same reviewer sets
  let previousTeamAssignments: Map<string, Set<string>> | undefined
  try {
    previousTeamAssignments = await loadPreviousTeamAssignments(teamId)
  }
  catch (err) {
    console.warn('[rotation] Failed to load previous team assignments, continuing without:', err)
  }

  // Build context and run rotation
  const context: TeamRotationContext = {
    squads: rotationSquads,
    allDeveloperIds,
    experiencedDeveloperIds,
    previousAssignments: previousTeamAssignments,
  }

  const assignments = runTeamRotation(context)

  // Convert to output format: targetId is the squad ID
  return Array.from(assignments.entries(), ([squadId, reviewerIds]) => ({
    targetId: squadId,
    reviewerIds,
  }))
}
