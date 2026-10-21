import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Badge from './Badge'
import { useToast } from '../hooks/useToast'
import { api } from '../services/api'
import { notifyIssuesChanged } from '../utils/issueEvents'
import { priorityTone, severityTone } from '../utils/badges'
import {
  PRIORITIES,
  STATUSES,
  STATUS_COLORS,
  formatDate,
  priorityLabel,
  severityLabel,
  statusLabel,
} from '../utils/labels'

/**
 * One issue as a card row (prototype's `.it`). The inline status select
 * PATCHes immediately on change and toasts the result; every list/counter
 * refreshes itself through the `bugtrack:issues-updated` signal.
 */
export default function IssueRow({ issue }) {
  const navigate = useNavigate()
  const showToast = useToast()
  const [statusError, setStatusError] = useState(null)

  const handleStatusChange = async (event) => {
    const nextStatus = event.target.value
    setStatusError(null)
    try {
      await api.updateStatus(issue.id, nextStatus)
      showToast(`#${issue.id} pasó a ${statusLabel(nextStatus)}`)
      notifyIssuesChanged()
    } catch (error) {
      // The select is controlled by the server state, so it reverts by itself.
      setStatusError(error?.message || 'No se pudo actualizar el estado.')
    }
  }

  return (
    <div className="it" data-testid={`issue-row-${issue.id}`}>
      <span className="id">#{issue.id}</span>

      <div>
        <button
          type="button"
          className="tt"
          onClick={() => navigate(`/issues/${issue.id}`)}
          data-testid={`issue-title-${issue.id}`}
        >
          {issue.title}
        </button>
        <div className="mt">Creada el {formatDate(issue.createdAt)}</div>
      </div>

      <div className="bs">
        <Badge tone={severityTone(issue.severity)} testId={`issue-severity-${issue.id}`}>
          {severityLabel(issue.severity)}
        </Badge>
        <Badge
          tone={priorityTone(issue.priority)}
          dots={PRIORITIES.indexOf(issue.priority)}
          testId={`issue-priority-${issue.id}`}
        >
          {priorityLabel(issue.priority)}
        </Badge>
      </div>

      <div className="it__status" data-testid={`issue-change-status-${issue.id}`}>
        <span className="sr-only" aria-hidden="true" data-testid={`issue-status-${issue.id}`}>
          {statusLabel(issue.status)}
        </span>
        <select
          className="sel b"
          style={{ '--c': STATUS_COLORS[issue.status] ?? 'var(--surf2)' }}
          aria-label={`Estado de la incidencia ${issue.id}`}
          value={issue.status}
          onChange={handleStatusChange}
          data-testid={`issue-status-select-${issue.id}`}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </select>
        {statusError && (
          <span className="er" role="alert">
            {statusError}
          </span>
        )}
      </div>

      <div className="ac">
        <Link className="btn btn--sm" to={`/issues/${issue.id}`} data-testid={`issue-view-${issue.id}`}>
          Ver
        </Link>
        <Link
          className="btn btn--sm"
          to={`/issues/${issue.id}/edit`}
          data-testid={`issue-edit-${issue.id}`}
        >
          Editar
        </Link>
      </div>
    </div>
  )
}
