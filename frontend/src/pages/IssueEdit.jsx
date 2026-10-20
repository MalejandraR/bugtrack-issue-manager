import { useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import IssueForm from '../components/IssueForm'
import Spinner from '../components/Spinner'
import { useToast } from '../hooks/useToast'
import { useIssue } from '../hooks/useIssue'
import { api } from '../services/api'

export default function IssueEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const { issue, loading, error, notFound, reload } = useIssue(id)

  const handleSubmit = async (values) => {
    await api.updateIssue(id, values)
    showToast('Incidencia actualizada correctamente.')
    navigate(`/issues/${id}`)
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
          message={`No encontramos ninguna incidencia con id ${id}.`}
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
          <p className="page__eyebrow">
            Editando incidencia <span data-testid="issue-edit-id">#{issue.id}</span>
          </p>
          <h1 className="page__title">{issue.title}</h1>
          <p className="page__subtitle">
            El estado se cambia desde la pantalla de detalle.
          </p>
        </div>
      </header>

      <IssueForm
        key={issue.id}
        initialValues={{
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          priority: issue.priority,
        }}
        submitLabel="Guardar cambios"
        onSubmit={handleSubmit}
        backTo={`/issues/${issue.id}`}
      />
    </div>
  )
}
