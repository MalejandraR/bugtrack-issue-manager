import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import Filters from '../components/Filters'
import IssueCard from '../components/IssueCard'
import IssueTable from '../components/IssueTable'
import Spinner from '../components/Spinner'
import { useIssues } from '../hooks/useIssues'
import { useMediaQuery } from '../hooks/useMediaQuery'

const MOBILE_QUERY = '(max-width: 767px)'
const FILTER_KEYS = ['status', 'priority', 'severity']

export default function IssuesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useMediaQuery(MOBILE_QUERY)

  const values = useMemo(() => {
    const next = {}
    for (const key of FILTER_KEYS) next[key] = searchParams.get(key) ?? ''
    return next
  }, [searchParams])

  const { issues, loading, error, reload } = useIssues(values)

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    setSearchParams({}, { replace: true })
  }

  const hasFilters = FILTER_KEYS.some((key) => values[key])

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Incidencias</h1>
          <p className="page__subtitle">
            {loading ? 'Cargando…' : `${issues.length} ${issues.length === 1 ? 'incidencia' : 'incidencias'}`}
          </p>
        </div>
        <Link className="btn btn--primary" to="/issues/new" data-testid="issues-new-issue">
          Crear incidencia
        </Link>
      </header>

      <Filters values={values} onChange={setFilter} onClear={clearFilters} />

      {loading && <Spinner label="Cargando incidencias…" />}

      {!loading && error && (
        <ErrorBanner
          message={`No se pudieron cargar las incidencias: ${error.message}`}
          onRetry={reload}
        />
      )}

      {!loading && !error && issues.length === 0 && hasFilters && (
        <EmptyState
          title="Sin resultados"
          message="Ninguna incidencia coincide con los filtros aplicados."
          actionLabel="Limpiar filtros"
          actionTo="/issues"
          actionTestId="empty-state-clear"
        />
      )}

      {!loading && !error && issues.length === 0 && !hasFilters && <EmptyState />}

      {!loading && !error && issues.length > 0 && (
        isMobile ? (
          <div className="issue-cards">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        ) : (
          <IssueTable issues={issues} />
        )
      )}
    </div>
  )
}
