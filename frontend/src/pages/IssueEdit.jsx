import { useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import IssueForm from '../components/IssueForm'
import Spinner from '../components/Spinner'
import { useToast } from '../hooks/useToast'
import { useIssue } from '../hooks/useIssue'
import { api } from '../services/api'
import { notifyIssuesChanged } from '../utils/issueEvents'

export default function IssueEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const { issue, loading, error, notFound, reload } = useIssue(id)

  const handleSubmit = async (values) => {
    await api.updateIssue(id, values)
    showToast('Incidencia actualizada correctamente.')
    notifyIssuesChanged()
    navigate(`/issues/${id}`)
  }

  if (loading) {
    return (
      <div className="page">
        <Spinner label="Cargando incidencia…" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="page" data-testid="issue-not-found">
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
      <div className="page">
        <ErrorBanner
          message={`No se pudo cargar la incidencia: ${error?.message ?? 'error desconocido'}`}
          onRetry={reload}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="head">
        <div>
          <h1>
            Editar incidencia <span data-testid="issue-edit-id">#{issue.id}</span>
          </h1>
          <p className="sub">Actualiza los datos del problema.</p>
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
