// Maps enum values to badge modifier classes so rows, cards and the drawer
// stay in sync. The actual colors live in utils/labels.js (single source).
import { PRIORITY_COLORS, SEVERITY_COLORS, STATUS_COLORS } from './labels'

export function statusTone(status) {
  if (status === 'OPEN') return 'status-open'
  if (status === 'IN_PROGRESS') return 'status-progress'
  if (status === 'CLOSED') return 'status-closed'
  return 'neutral'
}

export function severityTone(severity) {
  if (severity === 'CRITICAL') return 'severity-critical'
  if (severity === 'HIGH') return 'severity-high'
  if (severity === 'MEDIUM') return 'severity-medium'
  if (severity === 'LOW') return 'severity-low'
  return 'neutral'
}

export function priorityTone(priority) {
  if (priority === 'URGENT') return 'priority-urgent'
  if (priority === 'HIGH') return 'priority-high'
  if (priority === 'MEDIUM') return 'priority-medium'
  if (priority === 'LOW') return 'priority-low'
  return 'neutral'
}

/** Badge tone → CSS custom property value applied as `--c` on the chip. */
export const TONE_COLORS = {
  neutral: 'var(--surf2)',
  'status-open': STATUS_COLORS.OPEN,
  'status-progress': STATUS_COLORS.IN_PROGRESS,
  'status-closed': STATUS_COLORS.CLOSED,
  'severity-low': SEVERITY_COLORS.LOW,
  'severity-medium': SEVERITY_COLORS.MEDIUM,
  'severity-high': SEVERITY_COLORS.HIGH,
  'severity-critical': SEVERITY_COLORS.CRITICAL,
  'priority-low': PRIORITY_COLORS.LOW,
  'priority-medium': PRIORITY_COLORS.MEDIUM,
  'priority-high': PRIORITY_COLORS.HIGH,
  'priority-urgent': PRIORITY_COLORS.URGENT,
}
