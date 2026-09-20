export function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)

  if (parts.length === 0) {
    return '?'
  }

  const first = parts[0]
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined

  if (!first) {
    return '?'
  }

  if (!last || last === first) {
    return first.slice(0, 2).toUpperCase()
  }

  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}
