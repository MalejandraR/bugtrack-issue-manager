import { useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorBanner from './ErrorBanner'
import { PRIORITIES, SEVERITIES, priorityLabel, severityLabel } from '../utils/labels'

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

/**
 * Shared create/edit form. Status is intentionally not editable here:
 * the backend forces OPEN on create and status changes live on the detail page.
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
      <p className="field__error" id={`issue-form-error-${name}`} role="alert" data-testid={`issue-form-error-${name}`}>
        {errors[name]}
      </p>
    ) : null

  const ariaProps = (name) => ({
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `issue-form-error-${name}` : undefined,
  })

  return (
    <form className="issue-form" onSubmit={handleSubmit} noValidate data-testid="issue-form">
      {formError && <ErrorBanner message={formError} />}

      <div className="field">
        <label className="field__label" htmlFor="issue-form-title">
          Título <span className="field__required" aria-hidden="true">*</span>
        </label>
        <input
          id="issue-form-title"
          name="title"
          type="text"
          className="input"
          maxLength={200}
          value={values.title}
          onChange={(event) => setValue('title', event.target.value)}
          data-testid="issue-form-title"
          {...ariaProps('title')}
        />
        {fieldError('title')}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="issue-form-description">
          Descripción <span className="field__required" aria-hidden="true">*</span>
        </label>
        <textarea
          id="issue-form-description"
          name="description"
          className="textarea"
          rows={6}
          maxLength={5000}
          value={values.description}
          onChange={(event) => setValue('description', event.target.value)}
          data-testid="issue-form-description"
          {...ariaProps('description')}
        />
        {fieldError('description')}
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="issue-form-severity">
            Severidad <span className="field__required" aria-hidden="true">*</span>
          </label>
          <select
            id="issue-form-severity"
            name="severity"
            className="select"
            value={values.severity}
            onChange={(event) => setValue('severity', event.target.value)}
            data-testid="issue-form-severity"
            {...ariaProps('severity')}
          >
            <option value="">Selecciona una severidad</option>
            {SEVERITIES.map((value) => (
              <option key={value} value={value}>
                {severityLabel(value)}
              </option>
            ))}
          </select>
          {fieldError('severity')}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="issue-form-priority">
            Prioridad <span className="field__required" aria-hidden="true">*</span>
          </label>
          <select
            id="issue-form-priority"
            name="priority"
            className="select"
            value={values.priority}
            onChange={(event) => setValue('priority', event.target.value)}
            data-testid="issue-form-priority"
            {...ariaProps('priority')}
          >
            <option value="">Selecciona una prioridad</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {priorityLabel(value)}
              </option>
            ))}
          </select>
          {fieldError('priority')}
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={submitting}
          data-testid="issue-form-submit"
        >
          {submitting ? 'Guardando…' : submitLabel}
        </button>
        <Link className="btn btn--ghost" to={backTo} data-testid="issue-form-cancel">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
