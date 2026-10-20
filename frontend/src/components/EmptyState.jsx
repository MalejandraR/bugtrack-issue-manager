import { Link } from 'react-router-dom'

/** Empty state shown when there is nothing to display. */
export default function EmptyState({
  title = 'No hay incidencias todavía',
  message = 'Cuando crees la primera incidencia, va a aparecer acá.',
  actionLabel = 'Crear incidencia',
  actionTo = '/issues/new',
  actionTestId = 'empty-state-cta',
}) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        ◇
      </span>
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__message">{message}</p>
      {actionTo && (
        <Link className="btn btn--primary" to={actionTo} data-testid={actionTestId}>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
