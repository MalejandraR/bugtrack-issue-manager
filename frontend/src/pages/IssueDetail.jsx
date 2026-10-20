import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { useToast } from '../hooks/useToast'
import { useIssue } from '../hooks/useIssue'
import { api } from '../services/api'
import { priorityTone, severityTone, statusTone } from '../utils/badges'
import {
  STATUSES,
  formatDateTime,
  priorityLabel,
  severityLabel,
  statusLabel,
} from '../utils/labels'

export default function IssueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const { issue, loading, error, notFound, reload } = useIssue(id)

  const [statusValue, setStatusValue] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState(null)

  const currentStatus = issue?.status ?? ''
  const selectedStatus = statusValue || currentStatus
  const canSaveStatus = Boolean(selectedStatus) && selectedStatus !== currentStatus && !savingStatus

  const handleStatusSave = async () => {
    if (!selectedStatus || selectedStatus === currentStatus) return
    setSavingStatus(true)
    setStatusError(null)
    try {
      await api.updateStatus(issue.id, selectedStatus)
      showToast('Estado actualizado correctamente.')
      setStatusValue('')
      reload()
    } catch (err) {
      setStatusError(err?.message || 'No se pudo actualizar el estado.')
    } finally {
      setSavingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="page page--narrow">
        <Spinner label="Cargando incidencia…" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="page page--narrow" data-testid="issue-not-found">
        <EmptyState
          title="La incidencia no existe"
          message={`No encontramos ninguna incidencia con id ${id}. Puede que haya sido eliminada.`}
          actionLabel="Volver al listado"
          actionTo="/issues"
          actionTestId="issue-not-found-back"
        />
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="page page--narrow">
        <ErrorBanner
          message={`No se pudo cargar la incidencia: ${error?.message ?? 'error desconocido'}`}
          onRetry={reload}
        />
      </div>
    )
  }

  return (
    <div className="page page--narrow">
      <header className="page__header">
        <div>
          <p className="page__eyebrow" data-testid="issue-detail-id">
            Incidencia #{issue.id}
          </p>
          <h1 className="page__title" data-testid="issue-detail-title">
            {issue.title}
          </h1>
        </div>
        <div className="page__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/issues')}
            data-testid="issue-detail-back"
          >
            Volver
          </button>
          <Link
            className="btn btn--secondary"
            to={`/issues/${issue.id}/edit`}
            data-testid="issue-detail-edit"
          >
            Editar
          </Link>
        </div>
      </header>

      <section className="panel">
        <dl className="detail-grid">
          <div className="detail-grid__item">
            <dt>Estado</dt>
            <dd>
              <Badge tone={statusTone(issue.status)} testId="issue-detail-status">
                {statusLabel(issue.status)}
              </Badge>
            </dd>
          </div>
          <div className="detail-grid__item">
            <dt>Severidad</dt>
            <dd>
              <Badge tone={severityTone(issue.severity)} testId="issue-detail-severity">
                {severityLabel(issue.severity)}
              </Badge>
            </dd>
          </div>
          <div className="detail-grid__item">
            <dt>Prioridad</dt>
            <dd>
              <Badge tone={priorityTone(issue.priority)} testId="issue-detail-priority">
                {priorityLabel(issue.priority)}
              </Badge>
            </dd>
          </div>
          <div className="detail-grid__item">
            <dt>Creada</dt>
            <dd data-testid="issue-detail-created-at">{formatDateTime(issue.createdAt)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Actualizada</dt>
            <dd data-testid="issue-detail-updated-at">{formatDateTime(issue.updatedAt)}</dd>
          </div>
        </dl>

        <div className="detail-description">
          <h2 className="detail-description__title">Descripción</h2>
          <p className="detail-description__body" data-testid="issue-detail-description">
            {issue.description}
          </p>
        </div>
      </section>

      <section className="panel" id="cambiar-estado">
        <h2 className="panel__title">Cambiar estado</h2>
        {statusError && <ErrorBanner message={statusError} />}
        <div className="status-control">
          <div className="field field--inline">
            <label className="field__label" htmlFor="status-select">
              Nuevo estado
            </label>
            <select
              id="status-select"
              className="select"
              value={selectedStatus}
              onChange={(event) => setStatusValue(event.target.value)}
              data-testid="status-select"
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleStatusSave}
            disabled={!canSaveStatus}
            data-testid="status-save"
          >
            {savingStatus ? 'Guardando…' : 'Guardar estado'}
          </button>
        </div>
      </section>
    </div>
  )
}
