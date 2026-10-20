/** Loading indicator shown while a request is in flight. */
export default function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="spinner" role="status" aria-live="polite" data-testid="spinner">
      <span className="spinner__ring" aria-hidden="true" />
      <span className="spinner__label">{label}</span>
    </div>
  )
}
