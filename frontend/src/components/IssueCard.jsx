import { Link } from 'react-router-dom'
import Badge from './Badge'
import { formatDateTime, priorityLabel, severityLabel, statusLabel } from '../utils/labels'
import { priorityTone, severityTone, statusTone } from '../utils/badges'

/** Mobile card view of a single issue (same data as the table row). */
export default function IssueCard({ issue }) {
  return (
    <article className="issue-card" data-testid={`issue-row-${issue.id}`}>
      <header className="issue-card__header">
        <span className="issue-card__id">#{issue.id}</span>
        <Badge tone={statusTone(issue.status)} testId={`issue-status-${issue.id}`}>
          {statusLabel(issue.status)}
        </Badge>
      </header>

      <h2 className="issue-card__title">
        <Link to={`/issues/${issue.id}`} data-testid={`issue-title-${issue.id}`}>
          {issue.title}
        </Link>
      </h2>

      <dl className="issue-card__meta">
        <div>
          <dt>Severidad</dt>
          <dd>
            <Badge tone={severityTone(issue.severity)} testId={`issue-severity-${issue.id}`}>
              {severityLabel(issue.severity)}
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Prioridad</dt>
          <dd>
            <Badge tone={priorityTone(issue.priority)} testId={`issue-priority-${issue.id}`}>
              {priorityLabel(issue.priority)}
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Creada</dt>
          <dd className="issue-card__date">{formatDateTime(issue.createdAt)}</dd>
        </div>
      </dl>

      <div className="row-actions">
        <Link
          className="btn btn--ghost btn--sm"
          to={`/issues/${issue.id}`}
          data-testid={`issue-view-${issue.id}`}
        >
          Ver
        </Link>
        <Link
          className="btn btn--ghost btn--sm"
          to={`/issues/${issue.id}/edit`}
          data-testid={`issue-edit-${issue.id}`}
        >
          Editar
        </Link>
        <Link
          className="btn btn--ghost btn--sm"
          to={`/issues/${issue.id}#cambiar-estado`}
          data-testid={`issue-change-status-${issue.id}`}
        >
          Estado
        </Link>
      </div>
    </article>
  )
}
