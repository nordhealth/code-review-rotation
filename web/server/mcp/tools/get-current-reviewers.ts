import { defineMcpTool } from '@nuxtjs/mcp-toolkit/server'
import { z } from 'zod'

export default defineMcpTool({
  description: 'Get current code review assignments. Returns the latest rotation for each team, showing who reviews whom. Filter by team, developer, squad, or rotation mode.',
  inputSchema: {
    teamId: z.string().optional().describe('Filter by team ID'),
    developerId: z.string().optional().describe('Filter assignments where this developer is a target or reviewer'),
    squadId: z.string().optional().describe('Filter assignments by squad ID'),
    mode: z.enum(['devs', 'teams']).optional().describe('Filter by rotation mode: "devs" for individual developers, "teams" for squad-based'),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ teamId, developerId, squadId, mode }) => {
    const allLatest = await queryLatestRotations()

    let filtered = allLatest

    if (teamId) {
      filtered = filtered.filter(rotation => rotation.teamId === teamId)
    }

    if (mode) {
      filtered = filtered.filter(rotation => rotation.mode === mode)
    }

    const result = filtered.map((rotation) => {
      let assignments = rotation.assignments ?? []

      if (developerId) {
        assignments = assignments.filter(
          assignment =>
            (assignment.targetType === 'developer' && assignment.targetId === developerId)
            || assignment.reviewers.some(reviewer => reviewer.developer?.id === developerId),
        )
      }

      if (squadId) {
        assignments = assignments.filter(
          assignment => assignment.targetType === 'squad' && assignment.targetId === squadId,
        )
      }

      return {
        id: rotation.id,
        teamId: rotation.teamId,
        date: rotation.date,
        mode: rotation.mode,
        assignments: assignments.map(assignment => ({
          targetType: assignment.targetType,
          targetId: assignment.targetId,
          targetName: assignment.targetName,
          reviewers: assignment.reviewers.map(reviewer => ({
            id: reviewer.developer?.id,
            name: reviewer.developer
              ? `${reviewer.developer.firstName} ${reviewer.developer.lastName}`
              : reviewer.reviewerName,
            slackId: reviewer.developer?.slackId ?? null,
            gitlabId: reviewer.developer?.gitlabId ?? null,
          })),
        })),
      }
    })

    return result.filter(rotation => rotation.assignments.length > 0)
  },
})
