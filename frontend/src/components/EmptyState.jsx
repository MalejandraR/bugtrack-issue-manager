import { Link } from 'react-router-dom'

/**
 * Empty state (prototype's `.none`): dashed block with a friendly title.
 * Pass `onAction` for an imperative action (e.g. "Limpiar filtros") or
 * `actionTo` for a link (e.g. "Crear incidencia").
 */
export default function EmptyState({
  title = 'No hay incidencias todavía',
  message = 'Cuando crees la primera incidencia, va a aparecer acá.',
  actionLabel = 'Crear incidencia',
  actionTo = '/issues/new',
  onAction,
  actionTestId = 'empty-state-cta',
}) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__message">{message}</p>
      {actionLabel &&
        (onAction ? (
          <button type="button" className="btn" onClick={onAction} data-testid={actionTestId}>
            {actionLabel}
          </button>
        ) : (
          actionTo && (
            <Link className="btn btn--primary" to={actionTo} data-testid={actionTestId}>
              {actionLabel}
            </Link>
          )
        ))}
    </div>
  )
}
