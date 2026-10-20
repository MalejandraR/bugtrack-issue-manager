// Maps enum values to badge modifier classes so table and cards stay in sync.

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
