// Enum → Spanish label mapping (UI copy) and date formatting helpers.

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
export const STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED']

export const SEVERITY_LABELS = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const PRIORITY_LABELS = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export const STATUS_LABELS = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En progreso',
  CLOSED: 'Cerrada',
}

// NEObutalism palette taken from the HTML prototype (single source of the
// enum → color mapping: badges, status selects and radio pills all read it).
export const SEVERITY_COLORS = {
  LOW: '#C6F432',
  MEDIUM: '#6EC6FF',
  HIGH: '#FFA23A',
  CRITICAL: '#FF5C7A',
}

export const PRIORITY_COLORS = {
  LOW: '#E4E1F5',
  MEDIUM: '#CFC6FF',
  HIGH: '#B7A6FF',
  URGENT: '#9A85FF',
}

export const STATUS_COLORS = {
  OPEN: '#B7A6FF',
  IN_PROGRESS: '#FFD43B',
  CLOSED: '#C6F432',
}

export function severityLabel(value) {
  return SEVERITY_LABELS[value] ?? value ?? '—'
}

export function priorityLabel(value) {
  return PRIORITY_LABELS[value] ?? value ?? '—'
}

export function statusLabel(value) {
  return STATUS_LABELS[value] ?? value ?? '—'
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
})

const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Bogota',
})

/** Formats an ISO-8601 UTC string as "19 oct 2026, 3:12 p. m." (Colombia time). */
export function formatDateTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return DATE_TIME_FORMAT.format(date)
}

/** Formats an ISO-8601 UTC string as "20/10/2026" (Colombia date). */
export function formatDate(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return DATE_FORMAT.format(date)
}
