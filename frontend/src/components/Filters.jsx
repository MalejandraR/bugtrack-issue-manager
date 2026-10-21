import { PRIORITIES, SEVERITIES, STATUSES, priorityLabel, severityLabel, statusLabel } from '../utils/labels'

/**
 * Tools row of the list (prototype's `.tools`): free-text search plus the
 * status/priority/severity selects and the reset button. The search text is
 * local state (prototype's `F.q`); the selects mirror the URL params.
 */
export default function Filters({ query, onQueryChange, values, onChange, onClear }) {
  const hasFilters = Boolean(query || values.status || values.priority || values.severity)

  return (
    <div className="tools">
      <input
        className="in"
        id="filter-q"
        type="search"
        placeholder="Buscar por título o #ID"
        aria-label="Buscar"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />

      <select
        className="sel"
        id="filter-status"
        aria-label="Estado"
        value={values.status}
        onChange={(event) => onChange('status', event.target.value)}
        data-testid="filter-status"
      >
        <option value="">Todos los estados</option>
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {statusLabel(value)}
          </option>
        ))}
      </select>

      <select
        className="sel"
        id="filter-priority"
        aria-label="Prioridad"
        value={values.priority}
        onChange={(event) => onChange('priority', event.target.value)}
        data-testid="filter-priority"
      >
        <option value="">Todas las prioridades</option>
        {PRIORITIES.map((value) => (
          <option key={value} value={value}>
            {priorityLabel(value)}
          </option>
        ))}
      </select>

      <select
        className="sel"
        id="filter-severity"
        aria-label="Severidad"
        value={values.severity}
        onChange={(event) => onChange('severity', event.target.value)}
        data-testid="filter-severity"
      >
        <option value="">Todas las severidades</option>
        {SEVERITIES.map((value) => (
          <option key={value} value={value}>
            {severityLabel(value)}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="btn"
        onClick={onClear}
        disabled={!hasFilters}
        data-testid="filter-clear"
      >
        Limpiar
      </button>
    </div>
  )
}
