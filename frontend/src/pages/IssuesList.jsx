import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import Filters from '../components/Filters'
import IssueRow from '../components/IssueRow'
import Spinner from '../components/Spinner'
import { useIssues } from '../hooks/useIssues'
import { onIssuesChanged } from '../utils/issueEvents'

const FILTER_KEYS = ['status', 'priority', 'severity']

export default function IssuesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Free-text search is component state (prototype's F.q); the selects stay
  // in the URL so filtered views remain shareable.
  const [query, setQuery] = useState('')

  const { issues, loading, error, reload } = useIssues()

  // Live rows: create / edit / status changes fire the app-wide signal.
  useEffect(() => onIssuesChanged(reload), [reload])

  const values = useMemo(() => {
    const next = {}
    for (const key of FILTER_KEYS) next[key] = searchParams.get(key) ?? ''
    return next
  }, [searchParams])

  // The prototype filters the full collection client-side (the API list is
  // unfiltered), which also gives us the "N de M" subtitle for free.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace('#', '')
    return issues
      .filter(
        (issue) =>
          (!values.status || issue.status === values.status) &&
          (!values.priority || issue.priority === values.priority) &&
          (!values.severity || issue.severity === values.severity) &&
          (!q || issue.title.toLowerCase().includes(q) || String(issue.id) === q),
      )
      .sort((a, b) => b.id - a.id)
  }, [issues, values, query])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    setQuery('')
    setSearchParams({}, { replace: true })
  }

  const hasFilters = FILTER_KEYS.some((key) => values[key]) || Boolean(query)

  return (
    <div className="page">
      <header className="head">
        <div>
          <h1>Incidencias</h1>
          <p className="sub" data-testid="issues-count-subtitle">
            {loading
              ? 'Cargando…'
              : `${visible.length} ${visible.length === 1 ? 'incidencia' : 'incidencias'}${
                  visible.length !== issues.length ? ` de ${issues.length}` : ''
                }`}
          </p>
        </div>
        <Link className="btn btn--primary" to="/issues/new" data-testid="issues-new-issue">
          + Crear incidencia
        </Link>
      </header>

      <Filters
        query={query}
        onQueryChange={setQuery}
        values={values}
        onChange={setFilter}
        onClear={clearFilters}
      />

      {loading && <Spinner label="Cargando incidencias…" />}

      {!loading && error && (
        <ErrorBanner
          message={`No se pudieron cargar las incidencias: ${error.message}`}
          onRetry={reload}
        />
      )}

      {!loading && !error && visible.length === 0 && hasFilters && (
        <EmptyState
          title="Nada por aquí"
          message="Ninguna incidencia coincide con los filtros."
          actionLabel="Limpiar filtros"
          onAction={clearFilters}
          actionTestId="empty-state-clear"
        />
      )}

      {!loading && !error && visible.length === 0 && !hasFilters && <EmptyState />}

      {!loading && !error && visible.length > 0 && (
        <div className="list">
          {visible.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      )}

      {/* `/issues/:id` renders the detail drawer on top of the list. */}
      <Outlet />
    </div>
  )
}
