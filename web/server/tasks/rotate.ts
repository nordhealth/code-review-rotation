import { isRotationDue, mergeSquadSchedule } from '../utils/rotation/schedule'

export default defineTask({
  meta: {
    name: 'rotate',
    description: 'Check all teams and run rotations that are due',
  },
  async run() {
    // eslint-disable-next-line no-console
    console.log('[rotate-task] Checking teams for due rotations...')

    // Wait for DB to be ready (migrations may still be running on fresh starts)
    let allTeams
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        allTeams = await queryTeams()
        break
      }
      catch {
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        // eslint-disable-next-line no-console
        console.log('[rotate-task] Database not ready after retries, skipping.')
        return { result: { rotationsCreated: 0, results: [] } }
      }
    }
    const now = new Date()
    const results: { teamId: string, teamName: string, mode: string, rotationId: string }[] = []

    for (const team of allTeams) {
      const teamSchedule = await getEffectiveSchedule(team)

      // --- devs mode: unchanged, uses team schedule ---
      const recentRotations = await queryRotations(team.id, { limit: 10, offset: 0 })
      const lastDevRotation = recentRotations.find(rotation => rotation.mode === 'devs')
      const lastDevRotationDate = lastDevRotation ? new Date(lastDevRotation.date) : null

      if (isRotationDue(teamSchedule, now, lastDevRotationDate)) {
        const rawAssignments = await executeDevRotation(team.id)
        if (rawAssignments.length > 0) {
          const rotation = await createRotation({
            teamId: team.id,
            date: now,
            isManual: false,
            mode: 'devs',
            assignments: rawAssignments.map(assignment => ({
              targetType: 'developer' as const,
              targetId: assignment.targetId,
              reviewerDeveloperIds: assignment.reviewerIds,
            })),
          })
          results.push({ teamId: team.id, teamName: team.name, mode: 'devs', rotationId: rotation.id })
        }
      }

      // --- teams mode: per-squad schedules ---
      const teamSquads = await querySquads(team.id)
      const dueSquadIds: string[] = []

      for (const squad of teamSquads) {
        const squadSchedule = mergeSquadSchedule(teamSchedule, squad)
        const lastSquadDate = await queryLastSquadRotationDate(team.id, squad.id)
        if (isRotationDue(squadSchedule, now, lastSquadDate)) {
          dueSquadIds.push(squad.id)
        }
      }

      if (dueSquadIds.length > 0) {
        const rawAssignments = await executeTeamRotation(team.id, dueSquadIds)
        if (rawAssignments.length > 0) {
          const rotation = await createRotation({
            teamId: team.id,
            date: now,
            isManual: false,
            mode: 'teams',
            assignments: rawAssignments.map(assignment => ({
              targetType: 'squad' as const,
              targetId: assignment.targetId,
              reviewerDeveloperIds: assignment.reviewerIds,
            })),
          })
          results.push({ teamId: team.id, teamName: team.name, mode: 'teams', rotationId: rotation.id })
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[rotate-task] Done. Created ${results.length} rotation(s).`)
    return { result: { rotationsCreated: results.length, results } }
  },
})
