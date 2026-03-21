export default defineEventHandler(async (event) => {
  await requireApiKey(event)

  const query = getQuery(event)
  const teamId = query.teamId as string | undefined
  const developerId = query.developerId as string | undefined
  const squadId = query.squadId as string | undefined
  const mode = query.mode as 'devs' | 'teams' | undefined

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
})
