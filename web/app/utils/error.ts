export function extractErrorMessage(error: unknown, fallback: string): string {
  const fetchError = error as { data?: { message?: string, statusMessage?: string } }
  return fetchError?.data?.statusMessage ?? fetchError?.data?.message ?? fallback
}
