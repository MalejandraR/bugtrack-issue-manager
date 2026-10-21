import { useEffect } from 'react'

/** In-app success toast (prototype's dark pill). Never uses window.alert/confirm. */
export function SuccessToast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [message, onClose])

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite" data-testid="success-toast">
      <span className="toast__message">{message}</span>
      <button
        type="button"
        className="toast__close"
        onClick={onClose}
        aria-label="Cerrar mensaje"
        data-testid="success-toast-close"
      >
        ✕
      </button>
    </div>
  )
}
