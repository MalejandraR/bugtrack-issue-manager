import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Login page (route /login). NEObutalism, same visual language as the
 * create/edit forms: `.form` grid with the entry card + a yellow tip card.
 *
 * Registration is closed by design — the tip says so, and there is no
 * register link anywhere in the app.
 */
export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in (or just signed in): leave the login page.
  if (isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      // On success the context flips isAuthenticated → the <Navigate> above runs.
      await login(email, password)
    } catch (err) {
      // 401 gets a friendly, intentionally generic message (no user enumeration).
      if (err?.status === 401) {
        setError('Email o contraseña incorrectos. Verificá los datos e intentá de nuevo.')
      } else if (err?.status === 400 && err.fieldErrors) {
        setError('Completá el email y la contraseña.')
      } else {
        setError(err?.message || 'No se pudo iniciar sesión. Intentá más tarde.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page" data-testid="login-page">
      <header className="head">
        <div>
          <h1>Ingresar</h1>
          <p className="sub">
            Accedé con tu cuenta para crear, editar y cambiar el estado de las incidencias.
          </p>
        </div>
      </header>

      <div className="form">
        <form className="card" onSubmit={handleSubmit} noValidate data-testid="login-form">
          {error && (
            <p className="er" role="alert" data-testid="login-error">
              {error}
            </p>
          )}

          <div className="f">
            <label htmlFor="login-email">
              Email <span className="field__required" aria-hidden="true">*</span>
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              className="in"
              autoComplete="username"
              placeholder="ej.: admin@bugtrack.local"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              data-testid="login-email"
            />
          </div>

          <div className="f">
            <label htmlFor="login-password">
              Contraseña <span className="field__required" aria-hidden="true">*</span>
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              className="in"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              data-testid="login-password"
            />
          </div>

          <div className="acts">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting}
              data-testid="login-submit"
            >
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </button>
            <Link className="btn" to="/issues" data-testid="login-cancel">
              Volver al listado
            </Link>
          </div>
        </form>

        <aside className="card tip" data-testid="login-hint">
          <h2>¿Sin cuenta?</h2>
          <ul>
            <li>El registro está cerrado a propósito: las cuentas las crea el administrador del proyecto.</li>
            <li>Tu sesión dura 24 horas; después volvé a ingresar.</li>
            <li>Leer incidencias no requiere sesión: solo escribir.</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
