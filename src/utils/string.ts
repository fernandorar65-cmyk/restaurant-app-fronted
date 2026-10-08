export function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Minúsculas y sin tildes: "Jamón Ibérico" → "jamon iberico". Para comparar búsquedas. */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** "L'Étoile Atelier" → "l-etoile-atelier", para usar en URLs. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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
