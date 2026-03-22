defineRouteMeta({
  openAPI: {
    summary: 'Trigger scheduled rotation for teams',
    tags: ['Rotation Tasks'],
    parameters: [
      {
        in: 'query',
        name: 'teamId',
        schema: { type: 'string' },
        description: 'Filter to a specific team',
      },
      {
        in: 'query',
        name: 'mode',
        schema: { type: 'string', enum: ['devs', 'teams', 'all'] },
        description: 'Rotation mode to run',
      },
    ],
    responses: {
      200: {
        description: 'Rotation results',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                rotationsCreated: { type: 'integer' },
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      teamId: { type: 'string' },
                      teamName: { type: 'string' },
                      mode: { type: 'string' },
                      rotationId: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      401: { description: 'Invalid API key' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const apiKey = getHeader(event, 'x-api-key')
  const { apiKey: expectedKey } = useRuntimeConfig()

  if (!apiKey || apiKey !== expectedKey) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid API key' })
  }

  const query = getQuery(event)
  const teamIdFilter = query.teamId as string | undefined
  const modeFilter = query.mode as 'devs' | 'teams' | 'all' | undefined

  const allTeams = await queryTeams()
  const teamsToProcess = teamIdFilter ? allTeams.filter(t => t.id === teamIdFilter) : allTeams

  const modesToRun: ('devs' | 'teams')[]
    = modeFilter === 'devs' ? ['devs'] : modeFilter === 'teams' ? ['teams'] : ['devs', 'teams']

  const now = new Date()
  const results: { teamId: string, teamName: string, mode: string, rotationId: string }[] = []

  for (const team of teamsToProcess) {
    const schedule = await getEffectiveSchedule(team)

    for (const mode of modesToRun) {
      // Check interval since last rotation of this mode
      const recentRotations = await queryRotations(team.id, { limit: 10, offset: 0 })
      const lastRotation = recentRotations.find(r => r.mode === mode)

      if (lastRotation) {
        const daysSince
          = (now.getTime() - new Date(lastRotation.date).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSince < schedule.intervalDays) {
          continue
        }
      }

      // Run rotation via orchestrator
      const rawAssignments
        = mode === 'devs' ? await executeDevRotation(team.id) : await executeTeamRotation(team.id)

      if (rawAssignments.length === 0)
        continue

      const rotation = await createRotation({
        teamId: team.id,
        date: now,
        isManual: false,
        mode,
        assignments: rawAssignments.map(a => ({
          targetType: mode === 'devs' ? ('developer' as const) : ('squad' as const),
          targetId: a.targetId,
          reviewerDeveloperIds: a.reviewerIds,
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

  return {
    rotationsCreated: results.length,
    results,
  }
})
