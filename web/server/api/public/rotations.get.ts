export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const teamId = query.teamId as string | undefined
  const mode = query.mode as 'devs' | 'teams' | undefined

  const rotations = await queryLatestRotations()

  let filtered = rotations
  if (teamId) {
    filtered = filtered.filter((r) => r.teamId === teamId)
  }
  if (mode) {
    filtered = filtered.filter((r) => r.mode === mode)
  }

  return filtered
})
