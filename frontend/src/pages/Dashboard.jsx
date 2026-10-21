import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../components/Badge'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { useIssues } from '../hooks/useIssues'
import { onIssuesChanged } from '../utils/issueEvents'
import { priorityTone, severityTone } from '../utils/badges'
import {
  PRIORITIES,
  SEVERITIES,
  SEVERITY_COLORS,
  priorityLabel,
  severityLabel,
  statusLabel,
} from '../utils/labels'

/** Percentage of `value` relative to the total (0 when there are no issues). */
function percent(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export default function Dashboard() {
  const { issues, loading, error, reload } = useIssues()

  // Live counters: create / edit / status changes fire the app-wide signal.
  useEffect(() => onIssuesChanged(reload), [reload])

  const total = issues.length
  const open = issues.filter((issue) => issue.status === 'OPEN').length
  const inProgress = issues.filter((issue) => issue.status === 'IN_PROGRESS').length
  const closed = issues.filter((issue) => issue.status === 'CLOSED').length
  const resolvedPct = percent(closed, total)

  const severityRank = (value) => SEVERITIES.indexOf(value)
  const priorityRank = (value) => PRIORITIES.indexOf(value)

  // Not closed, severity HIGH or CRITICAL, worst first, top 4.
  const attention = issues
    .filter((issue) => issue.status !== 'CLOSED' && severityRank(issue.severity) >= severityRank('HIGH'))
    .sort(
      (a, b) =>
        severityRank(b.severity) - severityRank(a.severity) ||
        priorityRank(b.priority) - priorityRank(a.priority),
    )
    .slice(0, 4)

  const severityCounts = SEVERITIES.map(
    (severity) => issues.filter((issue) => issue.severity === severity).length,
  )
  const maxSeverity = Math.max(1, ...severityCounts)
  const priorityCounts = PRIORITIES.map(
    (priority) => issues.filter((issue) => issue.priority === priority).length,
  )

  return (
    <div className="page">
      <header className="head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">Resumen general de las incidencias del proyecto.</p>
          <p className="substat">
            Total: <span data-testid="dashboard-counter-total">{total}</span> incidencias
          </p>
        </div>
        <Link className="btn btn--primary" to="/issues/new" data-testid="dashboard-new-issue">
          + Crear incidencia
        </Link>
      </header>

      {loading && <Spinner label="Cargando incidencias…" />}

      {!loading && error && (
        <ErrorBanner
          message={`No se pudieron cargar las incidencias: ${error.message}`}
          onRetry={reload}
        />
      )}

      {!loading && !error && (
        <div className="g">
          <section
            className="blk b5"
            style={{ '--c': 'var(--lime)' }}
            data-testid="dashboard-counter-closed"
          >
            <p className="k">Resuelto</p>
            <p className="num">{resolvedPct}%</p>
            <p>
              {closed} de {total} incidencias cerradas
            </p>
          </section>

          <section
            className="blk b3"
            style={{ '--c': 'var(--vio)' }}
            data-testid="dashboard-counter-open"
          >
            <p className="k">Abiertas</p>
            <p className="num">{open}</p>
            <p>esperando turno</p>
          </section>

          <section
            className="blk b4"
            style={{ '--c': 'var(--sun)' }}
            data-testid="dashboard-counter-in-progress"
          >
            <p className="k">En progreso</p>
            <p className="num">{inProgress}</p>
            <p>en manos del equipo</p>
          </section>

          <section className="card b7">
            <h2>Requieren atención</h2>
            {attention.length > 0 ? (
              <ul className="att">
                {attention.map((issue) => (
                  <li key={issue.id}>
                    <Link to={`/issues/${issue.id}`}>
                      <span>
                        {issue.title}
                        <small>
                          #{issue.id} · {statusLabel(issue.status)}
                        </small>
                      </span>
                      <Badge tone={severityTone(issue.severity)}>
                        {severityLabel(issue.severity)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sub">
                Todo bajo control. No hay incidencias altas ni críticas abiertas.
              </p>
            )}
          </section>

          <section className="card b5" data-testid="dashboard-severity-report">
            <h2>Por severidad</h2>
            <div className="cols" role="img" aria-label="Incidencias por severidad">
              {SEVERITIES.map((severity, index) => (
                <div
                  key={severity}
                  className="col"
                  data-testid={`dashboard-severity-${severity.toLowerCase()}`}
                >
                  <b>{severityCounts[index]}</b>
                  <i
                    style={{
                      '--c': SEVERITY_COLORS[severity],
                      height: `${(severityCounts[index] / maxSeverity) * 72}%`,
                    }}
                  />
                  <span>{severityLabel(severity)}</span>
                </div>
              ))}
            </div>
            <div className="pri">
              {PRIORITIES.map((priority, index) => (
                <Badge key={priority} tone={priorityTone(priority)}>
                  {priorityLabel(priority)} · {priorityCounts[index]}
                </Badge>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
