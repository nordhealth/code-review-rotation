import { isRotationDue } from '../utils/rotation/schedule'

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
      const schedule = await getEffectiveSchedule(team)

      for (const mode of ['devs', 'teams'] as const) {
        const recentRotations = await queryRotations(team.id, { limit: 10, offset: 0 })
        const lastRotation = recentRotations.find(rotation => rotation.mode === mode)
        const lastRotationDate = lastRotation ? new Date(lastRotation.date) : null

        if (!isRotationDue(schedule, now, lastRotationDate))
          continue

        const rawAssignments
          = mode === 'devs' ? await executeDevRotation(team.id) : await executeTeamRotation(team.id)

        if (rawAssignments.length === 0)
          continue

        const rotation = await createRotation({
          teamId: team.id,
          date: now,
          isManual: false,
          mode,
          assignments: rawAssignments.map(assignment => ({
            targetType: mode === 'devs' ? ('developer' as const) : ('squad' as const),
            targetId: assignment.targetId,
            reviewerDeveloperIds: assignment.reviewerIds,
          })),
        })

        results.push({
          teamId: team.id,
          teamName: team.name,
          mode,
          rotationId: rotation.id,
        })
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[rotate-task] Done. Created ${results.length} rotation(s).`)
    return { result: { rotationsCreated: results.length, results } }
  },
})
