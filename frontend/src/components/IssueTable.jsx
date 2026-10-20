import { Link } from 'react-router-dom'
import Badge from './Badge'
import { formatDate, priorityLabel, severityLabel, statusLabel } from '../utils/labels'
import { priorityTone, severityTone, statusTone } from '../utils/badges'

/** Desktop table view of a list of issues. */
export default function IssueTable({ issues }) {
  return (
    <div className="table-wrap">
      <table className="issue-table">
        <caption className="sr-only">Listado de incidencias</caption>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Título</th>
            <th scope="col">Severidad</th>
            <th scope="col">Prioridad</th>
            <th scope="col">Estado</th>
            <th scope="col">Creada</th>
            <th scope="col">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id} data-testid={`issue-row-${issue.id}`}>
              <td className="issue-table__id">#{issue.id}</td>
              <td className="issue-table__title">
                <Link to={`/issues/${issue.id}`} data-testid={`issue-title-${issue.id}`}>
                  {issue.title}
                </Link>
              </td>
              <td>
                <Badge tone={severityTone(issue.severity)} testId={`issue-severity-${issue.id}`}>
                  {severityLabel(issue.severity)}
                </Badge>
              </td>
              <td>
                <Badge tone={priorityTone(issue.priority)} testId={`issue-priority-${issue.id}`}>
                  {priorityLabel(issue.priority)}
                </Badge>
              </td>
              <td>
                <Badge tone={statusTone(issue.status)} testId={`issue-status-${issue.id}`}>
                  {statusLabel(issue.status)}
                </Badge>
              </td>
              <td className="issue-table__date">{formatDate(issue.createdAt)}</td>
              <td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
