import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { useIssues } from '../hooks/useIssues'
import { SEVERITIES, severityLabel } from '../utils/labels'

const COUNTERS = [
  {
    key: 'total',
    label: 'Total',
    testId: 'dashboard-counter-total',
    to: '/issues',
    pick: () => true,
    tone: 'counter--total',
  },
  {
    key: 'open',
    label: 'Abiertas',
    testId: 'dashboard-counter-open',
    to: '/issues?status=OPEN',
    pick: (issue) => issue.status === 'OPEN',
    tone: 'counter--open',
  },
  {
    key: 'in-progress',
    label: 'En progreso',
    testId: 'dashboard-counter-in-progress',
    to: '/issues?status=IN_PROGRESS',
    pick: (issue) => issue.status === 'IN_PROGRESS',
    tone: 'counter--progress',
  },
  {
    key: 'closed',
    label: 'Cerradas',
    testId: 'dashboard-counter-closed',
    to: '/issues?status=CLOSED',
    pick: (issue) => issue.status === 'CLOSED',
    tone: 'counter--closed',
  },
]

/** Percentage of `value` relative to the total (0 when there are no issues). */
function percent(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export default function Dashboard() {
  const { issues, loading, error, reload } = useIssues()

  const counts = {
    total: issues.length,
    open: issues.filter((i) => i.status === 'OPEN').length,
    'in-progress': issues.filter((i) => i.status === 'IN_PROGRESS').length,
    closed: issues.filter((i) => i.status === 'CLOSED').length,
  }
  const total = counts.total

  const severityCounts = Object.fromEntries(
    SEVERITIES.map((severity) => [
      severity,
      issues.filter((issue) => issue.severity === severity).length,
    ]),
  )

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__subtitle">Resumen general de las incidencias del proyecto.</p>
        </div>
        <Link className="btn btn--primary" to="/issues/new" data-testid="dashboard-new-issue">
          Crear incidencia
        </Link>
      </header>

      {loading && <Spinner label="Cargando incidencias…" />}

      {!loading && error && (
        <ErrorBanner
          message={`No se pudieron cargar las incidencias: ${error.message}`}
          onRetry={reload}
        />
      )}

      {!loading && !error && issues.length === 0 && (
        <EmptyState />
      )}

      {!loading && !error && issues.length > 0 && (
        <>
          <div className="counters">
            {COUNTERS.map((counter) => {
              const value = counts[counter.key]
              const pct = percent(value, total)
              return (
                <Link
                  key={counter.key}
                  className={`counter ${counter.tone}`}
                  to={counter.to}
                  data-testid={counter.testId}
                >
                  <span className="counter__row">
                    <span className="counter__value">{value}</span>
                    <span className="counter__pct">{pct}%</span>
                  </span>
                  <span className="counter__label">{counter.label}</span>
                  <span className="counter__bar" aria-hidden="true">
                    <span className="counter__bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                </Link>
              )
            })}
          </div>

          <section
            className="panel severity-report"
            data-testid="dashboard-severity-report"
          >
            <h2 className="panel__title">Incidencias por severidad</h2>
            <ul className="severity-report__list">
              {SEVERITIES.map((severity) => {
                const value = severityCounts[severity]
                const pct = percent(value, total)
                return (
                  <li
                    key={severity}
                    className="severity-report__row"
                    data-testid={`dashboard-severity-${severity.toLowerCase()}`}
                  >
                    <span className="severity-report__label">{severityLabel(severity)}</span>
                    <span
                      className="severity-report__track"
                      role="img"
                      aria-label={`${value} de ${total} incidencias (${pct}%)`}
                    >
                      <span
                        className={`severity-report__bar severity-report__bar--${severity.toLowerCase()}`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="severity-report__count">
                      {value} <span className="severity-report__pct">({pct}%)</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
