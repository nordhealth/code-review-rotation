import { selectBalanced } from './helpers'

export interface RotationSquad {
  id: string
  name: string
  reviewerCount: number
  memberIds: string[] // developer IDs in this squad
}

export interface TeamRotationContext {
  squads: RotationSquad[]
  allDeveloperIds: string[] // all team developer IDs
  experiencedDeveloperIds: string[] // experienced dev IDs only
  /** Previous rotation's reviewer sets per squad (squad ID → set of reviewer IDs) */
  previousAssignments?: Map<string, Set<string>>
}

/**
 * Run team (squad) rotation.
 *
 * Equivalent to Python's `assign_team_reviewers`.
 * Returns a Map from squad ID to array of reviewer developer IDs.
 *
 * Logic per squad:
 * - 0 members -> select N from experiencedDeveloperIds (load-balanced)
 * - < N members -> all members + fill from non-members in experiencedDeveloperIds (load-balanced)
 * - >= N members -> select N from members (load-balanced)
 *
 * Cooldown rule: when a squad has members >= 2 × reviewerCount, the previous
 * rotation's reviewers are completely excluded from the candidate pool. This
 * guarantees fair distribution and prevents the same people being picked
 * in consecutive rotations.
 *
 * Uses a shared assignmentCount across all squads for global load balancing.
 * Retries up to 10 times to avoid repeating the exact same reviewer set as
 * the previous rotation for any squad.
 */
export function runTeamRotation(context: TeamRotationContext): Map<string, string[]> {
  const { previousAssignments } = context
  const maxRetries = previousAssignments ? 10 : 1

  let bestResult: Map<string, string[]> | null = null
  let bestRepeats = Infinity

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = runTeamRotationOnce(context)

    if (!previousAssignments)
      return result

    // Count squads with exact same reviewer set as previous
    let repeats = 0
    for (const [squadId, reviewerIds] of result) {
      const prev = previousAssignments.get(squadId)
      if (!prev || prev.size === 0)
        continue
      const current = new Set(reviewerIds)
      if (current.size === prev.size && [...current].every(id => prev.has(id))) {
        repeats++
      }
    }

    if (repeats === 0)
      return result

    if (repeats < bestRepeats) {
      bestRepeats = repeats
      bestResult = result
    }
  }

  return bestResult!
}

function runTeamRotationOnce(context: TeamRotationContext): Map<string, string[]> {
  const { squads, experiencedDeveloperIds, previousAssignments } = context
  const result = new Map<string, string[]>()

  // Track assignments per developer for load balancing ACROSS ALL squads
  const assignmentCounts = new Map<string, number>()

  for (const squad of squads) {
    const numMembers = squad.memberIds.length
    const numReviewers = squad.reviewerCount
    let selected: string[] = []

    // Cooldown rule: when members >= 2 × reviewerCount, exclude the
    // previous rotation's reviewers entirely so the same people aren't
    // picked in consecutive rotations.
    const prevReviewers = previousAssignments?.get(squad.id)
    const cooldownApplies
      = prevReviewers && prevReviewers.size > 0 && numMembers >= 2 * numReviewers

    if (numMembers === 0) {
      // No team members -> assign balanced experienced devs
      let pool = experiencedDeveloperIds
      /* v8 ignore next 3 -- cooldownApplies requires numMembers >= 2*numReviewers, unreachable when 0 */
      if (cooldownApplies) {
        pool = pool.filter(id => !prevReviewers.has(id))
      }
      selected = selectBalanced(pool, numReviewers, assignmentCounts)
    }
    else if (numMembers < numReviewers) {
      // Fewer members than needed -> use all + fill with experienced devs not in this squad
      selected = [...squad.memberIds]

      // Track member assignments
      for (const devId of selected) {
        assignmentCounts.set(devId, (assignmentCounts.get(devId) ?? 0) + 1)
      }

      // Get experienced devs not in this squad
      const eligible = experiencedDeveloperIds.filter(id => !squad.memberIds.includes(id))

      // Fill remaining slots with balanced selection
      const remainingSlots = numReviewers - numMembers
      if (eligible.length > 0 && remainingSlots > 0) {
        const fillers = selectBalanced(eligible, remainingSlots, assignmentCounts)
        selected = [...selected, ...fillers]

        // Track filler assignments
        for (const devId of fillers) {
          assignmentCounts.set(devId, (assignmentCounts.get(devId) ?? 0) + 1)
        }
      }

      result.set(squad.id, selected)
      continue
    }
    else {
      // Enough members -> select balanced from team
      let pool = squad.memberIds
      if (cooldownApplies) {
        pool = pool.filter(id => !prevReviewers.has(id))
      }
      selected = selectBalanced(pool, numReviewers, assignmentCounts)
    }

    // Track assignments (for cases 0 members and >= N members)
    for (const devId of selected) {
      assignmentCounts.set(devId, (assignmentCounts.get(devId) ?? 0) + 1)
    }

    result.set(squad.id, selected)
  }

  return result
}
