/** Error banner with an optional "Reintentar" action. */
export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-banner" role="alert" data-testid="error-banner">
      <div className="error-banner__body">
        <strong className="error-banner__title">Algo salió mal</strong>
        <span className="error-banner__message">{message}</span>
      </div>
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={onRetry} data-testid="error-retry">
          Reintentar
        </button>
      )}
    </div>
  )
}
