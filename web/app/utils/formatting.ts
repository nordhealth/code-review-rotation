export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName.charAt(0)
  const last = lastName ? lastName.charAt(0) : ''
  return `${first}${last}`.toUpperCase()
}

export function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}
