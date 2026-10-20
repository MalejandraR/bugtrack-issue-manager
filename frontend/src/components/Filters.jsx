import { PRIORITIES, SEVERITIES, STATUSES, priorityLabel, severityLabel, statusLabel } from '../utils/labels'

/** Combinable status/priority/severity filters plus a reset action. */
export default function Filters({ values, onChange, onClear }) {
  const hasFilters = Boolean(values.status || values.priority || values.severity)

  return (
    <section className="filters" aria-label="Filtros de incidencias">
      <div className="filters__group">
        <div className="field field--inline">
          <label className="field__label" htmlFor="filter-status">
            Estado
          </label>
          <select
            id="filter-status"
            className="select"
            value={values.status}
            onChange={(event) => onChange('status', event.target.value)}
            data-testid="filter-status"
          >
            <option value="">Todos</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="field field--inline">
          <label className="field__label" htmlFor="filter-priority">
            Prioridad
          </label>
          <select
            id="filter-priority"
            className="select"
            value={values.priority}
            onChange={(event) => onChange('priority', event.target.value)}
            data-testid="filter-priority"
          >
            <option value="">Todas</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {priorityLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="field field--inline">
          <label className="field__label" htmlFor="filter-severity">
            Severidad
          </label>
          <select
            id="filter-severity"
            className="select"
            value={values.severity}
            onChange={(event) => onChange('severity', event.target.value)}
            data-testid="filter-severity"
          >
            <option value="">Todas</option>
            {SEVERITIES.map((value) => (
              <option key={value} value={value}>
                {severityLabel(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        className="btn btn--ghost"
        onClick={onClear}
        disabled={!hasFilters}
        data-testid="filter-clear"
      >
        Limpiar filtros
      </button>
    </section>
  )
}
