import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Badge from './Badge'
import { useIssue } from '../hooks/useIssue'
import { useToast } from '../hooks/useToast'
import { api } from '../services/api'
import { notifyIssuesChanged } from '../utils/issueEvents'
import { priorityTone, severityTone } from '../utils/badges'
import {
  PRIORITIES,
  STATUSES,
  STATUS_COLORS,
  formatDate,
  formatDateTime,
  priorityLabel,
  severityLabel,
  statusLabel,
} from '../utils/labels'

/**
 * Issue detail as a right-side drawer (prototype's `.dr` + `.ov`).
 * Mounted by the nested `/issues/:id` route on top of the list, so deep
 * links work, the browser back button closes it and the list keeps its
 * scroll position. Escape and the backdrop close it too; focus moves into
 * the drawer on open and returns to the opener on close.
 *
 * The loading / error / not-found states intentionally do NOT reuse the
 * shared `spinner`, `error-banner`, `error-retry` or `empty-state` testids:
 * the list always renders behind the drawer, so those testids would appear
 * twice in the DOM.
 */
export default function IssueDetailDrawer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const showToast = useToast()
  const { issue, loading, error, notFound, reload } = useIssue(id)
  const [statusError, setStatusError] = useState(null)
  const closeRef = useRef(null)
  const openerRef = useRef(null)

  // Close = go back to the list: pop the history entry when we came from the
  // app (list, dashboard…), otherwise replace the deep link with `/issues`.
  const closeDrawer = useCallback(() => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/issues', { replace: true })
  }, [location.key, navigate])

  useEffect(() => {
    openerRef.current = document.activeElement
    closeRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const opener = openerRef.current
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus()
      }
    }
  }, [closeDrawer])

  const handleStatusChange = async (event) => {
    const nextStatus = event.target.value
    setStatusError(null)
    try {
      await api.updateStatus(issue.id, nextStatus)
      showToast(`#${issue.id} pasó a ${statusLabel(nextStatus)}`)
      reload()
      notifyIssuesChanged()
    } catch (err) {
      setStatusError(err?.message || 'No se pudo actualizar el estado.')
    }
  }

  return (
    <>
      <div className="ov" onClick={closeDrawer} />
      <aside
        className="dr"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de la incidencia"
      >
        {loading && (
          <p className="spinner" role="status">
            <span className="spinner__ring" aria-hidden="true" />
            Cargando incidencia…
          </p>
        )}

        {notFound && (
          <div className="dr__state" data-testid="issue-not-found">
            <p className="dr__state-title">La incidencia no existe</p>
            <p>
              No encontramos ninguna incidencia con id {id}. Puede que haya sido eliminada.
            </p>
            <Link className="btn" to="/issues" data-testid="issue-not-found-back">
              Volver al listado
            </Link>
          </div>
        )}

        {!loading && !notFound && (error || !issue) && (
          <div className="dr__state" role="alert">
            <p className="dr__state-title">Algo salió mal</p>
            <p>No se pudo cargar la incidencia: {error?.message ?? 'error desconocido'}</p>
            <button type="button" className="btn" onClick={reload}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !notFound && issue && (
          <>
            <div className="dr__head">
              <span className="id" data-testid="issue-detail-id">
                #{issue.id}
              </span>
              <button
                type="button"
                className="btn btn--sm"
                onClick={closeDrawer}
                ref={closeRef}
                data-testid="issue-detail-back"
              >
                Cerrar
              </button>
            </div>

            <h2 data-testid="issue-detail-title">{issue.title}</h2>
            <p className="desc" data-testid="issue-detail-description">
              {issue.description}
            </p>

            <dl>
              <dt>Estado</dt>
              <dd data-testid="issue-detail-status">
                <select
                  className="sel b"
                  style={{ '--c': STATUS_COLORS[issue.status] ?? 'var(--surf2)' }}
                  aria-label="Estado"
                  value={issue.status}
                  onChange={handleStatusChange}
                  data-testid="status-select"
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </select>
                {statusError && (
                  <p className="er" role="alert">
                    {statusError}
                  </p>
                )}
              </dd>

              <dt>Severidad</dt>
              <dd>
                <Badge tone={severityTone(issue.severity)} testId="issue-detail-severity">
                  {severityLabel(issue.severity)}
                </Badge>
              </dd>

              <dt>Prioridad</dt>
              <dd>
                <Badge
                  tone={priorityTone(issue.priority)}
                  dots={PRIORITIES.indexOf(issue.priority)}
                  testId="issue-detail-priority"
                >
                  {priorityLabel(issue.priority)}
                </Badge>
              </dd>

              <dt>Creada</dt>
              <dd data-testid="issue-detail-created-at">{formatDate(issue.createdAt)}</dd>

              <dt>Actualizada</dt>
              <dd data-testid="issue-detail-updated-at">{formatDateTime(issue.updatedAt)}</dd>
            </dl>

            <Link
              className="btn btn--primary dr__edit"
              to={`/issues/${issue.id}/edit`}
              data-testid="issue-detail-edit"
            >
              Editar incidencia
            </Link>
          </>
        )}
      </aside>
    </>
  )
}
