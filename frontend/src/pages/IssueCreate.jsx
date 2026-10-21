import { useNavigate } from 'react-router-dom'
import IssueForm from '../components/IssueForm'
import { useToast } from '../hooks/useToast'
import { api } from '../services/api'
import { notifyIssuesChanged } from '../utils/issueEvents'

export default function IssueCreate() {
  const navigate = useNavigate()
  const showToast = useToast()

  const handleSubmit = async (values) => {
    const created = await api.createIssue(values)
    showToast('Incidencia creada correctamente.')
    notifyIssuesChanged()
    navigate(created?.id ? `/issues/${created.id}` : '/issues')
  }

  return (
    <div className="page">
      <header className="head">
        <div>
          <h1>Crear incidencia</h1>
          <p className="sub">
            Describe el problema. La incidencia nace con estado <strong>Abierta</strong>.
          </p>
        </div>
      </header>

      <IssueForm
        initialValues={{ title: '', description: '', severity: '', priority: '' }}
        submitLabel="Crear incidencia"
        onSubmit={handleSubmit}
        backTo="/issues"
      />
    </div>
  )
}
