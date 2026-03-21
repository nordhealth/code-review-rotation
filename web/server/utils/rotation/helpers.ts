/** Fisher-Yates shuffle (returns a new array, does not mutate) */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Select `count` items from candidates, preferring those with lowest assignment count */
export function selectBalanced(
  candidates: string[],
  count: number,
  assignmentCounts: Map<string, number>,
): string[] {
  if (count >= candidates.length)
    return [...candidates]
  const shuffled = shuffleArray(candidates)
  shuffled.sort((a, b) => (assignmentCounts.get(a) ?? 0) - (assignmentCounts.get(b) ?? 0))
  return shuffled.slice(0, count)
}
