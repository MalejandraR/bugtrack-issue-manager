import { useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorBanner from './ErrorBanner'
import {
  PRIORITIES,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  SEVERITIES,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
} from '../utils/labels'

function validate(values) {
  const errors = {}
  const title = (values.title ?? '').trim()
  const description = (values.description ?? '').trim()

  if (!title) {
    errors.title = 'El título es obligatorio.'
  } else if (title.length > 200) {
    errors.title = 'El título no puede superar los 200 caracteres.'
  }

  if (!description) {
    errors.description = 'La descripción es obligatoria.'
  } else if (description.length > 5000) {
    errors.description = 'La descripción no puede superar los 5.000 caracteres.'
  }

  if (!SEVERITIES.includes(values.severity)) {
    errors.severity = 'Selecciona una severidad.'
  }

  if (!PRIORITIES.includes(values.priority)) {
    errors.priority = 'Selecciona una prioridad.'
  }

  return errors
}

const EMPTY_VALUES = { title: '', description: '', severity: '', priority: '' }

/** Radio pills (prototype's `.rd`) for a required enum field. */
function RadioPills({ name, legend, options, labels, colors, value, error, onChange, testId }) {
  const legendId = `issue-form-${name}-legend`
  const errorId = `issue-form-error-${name}`

  return (
    <fieldset className="f">
      <legend id={legendId}>
        {legend} <span className="field__required" aria-hidden="true">*</span>
      </legend>
      <div className="rd" role="radiogroup" aria-labelledby={legendId} data-testid={testId}>
        {options.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? errorId : undefined}
            />
            <span style={{ '--c': colors[option] }}>{labels[option]}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="er" id={errorId} role="alert" data-testid={`issue-form-error-${name}`}>
          {error}
        </p>
      )}
    </fieldset>
  )
}

/**
 * Shared create/edit form (prototype's `.form`: card + yellow tip card).
 * Status is intentionally not editable here: the backend forces OPEN on
 * create and status changes live on the list rows and the detail drawer.
 */
export default function IssueForm({ initialValues, submitLabel, onSubmit, backTo }) {
  const [values, setValues] = useState({ ...EMPTY_VALUES, ...initialValues })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const setValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        severity: values.severity,
        priority: values.priority,
      })
    } catch (error) {
      if (error?.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setErrors((current) => ({ ...current, ...error.fieldErrors }))
        setFormError('Revisa los campos marcados: el servidor detectó errores de validación.')
      } else {
        setFormError(error?.message || 'No se pudo guardar la incidencia.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const fieldError = (name) =>
    errors[name] ? (
      <p className="er" id={`issue-form-error-${name}`} role="alert" data-testid={`issue-form-error-${name}`}>
        {errors[name]}
      </p>
    ) : null

  const ariaProps = (name) => ({
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `issue-form-error-${name}` : undefined,
  })

  return (
    <div className="form">
      <form className="card" onSubmit={handleSubmit} noValidate data-testid="issue-form">
        {formError && <ErrorBanner message={formError} />}

        <div className="f">
          <label htmlFor="issue-form-title">
            Título <span className="field__required" aria-hidden="true">*</span>
          </label>
          <input
            id="issue-form-title"
            name="title"
            type="text"
            className="in"
            maxLength={200}
            placeholder="Ej.: El botón Guardar no responde en móvil"
            value={values.title}
            onChange={(event) => setValue('title', event.target.value)}
            data-testid="issue-form-title"
            {...ariaProps('title')}
          />
          {fieldError('title')}
        </div>

        <div className="f">
          <label htmlFor="issue-form-description">
            Descripción <span className="field__required" aria-hidden="true">*</span>
          </label>
          <textarea
            id="issue-form-description"
            name="description"
            className="in"
            rows={6}
            maxLength={5000}
            placeholder={'Pasos para reproducirlo\nResultado esperado\nResultado actual'}
            value={values.description}
            onChange={(event) => setValue('description', event.target.value)}
            data-testid="issue-form-description"
            {...ariaProps('description')}
          />
          {fieldError('description')}
        </div>

        <RadioPills
          name="severity"
          legend="Severidad"
          options={SEVERITIES}
          labels={SEVERITY_LABELS}
          colors={SEVERITY_COLORS}
          value={values.severity}
          error={errors.severity}
          onChange={(value) => setValue('severity', value)}
          testId="issue-form-severity"
        />

        <RadioPills
          name="priority"
          legend="Prioridad"
          options={PRIORITIES}
          labels={PRIORITY_LABELS}
          colors={PRIORITY_COLORS}
          value={values.priority}
          error={errors.priority}
          onChange={(value) => setValue('priority', value)}
          testId="issue-form-priority"
        />

        <div className="acts">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
            data-testid="issue-form-submit"
          >
            {submitting ? 'Guardando…' : submitLabel}
          </button>
          <Link className="btn" to={backTo} data-testid="issue-form-cancel">
            Cancelar
          </Link>
        </div>
      </form>

      <aside className="card tip">
        <h2>Una buena incidencia</h2>
        <ul>
          <li>Un título que diga qué falla y dónde.</li>
          <li>Los pasos para reproducirlo.</li>
          <li>Qué esperabas y qué pasó realmente.</li>
          <li>La severidad mide el daño; la prioridad, qué tan pronto se atiende.</li>
        </ul>
      </aside>
    </div>
  )
}
