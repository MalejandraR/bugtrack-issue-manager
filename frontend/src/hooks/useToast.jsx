import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { SuccessToast } from '../components/SuccessToast'

const AUTO_DISMISS_MS = 4000

const ToastContext = createContext(null)

/** Owns the toast state at app level so success messages survive navigation. */
export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null)
  const timerRef = useRef(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setMessage(null)
  }, [])

  const show = useCallback((text) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setMessage(text)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setMessage(null)
    }, AUTO_DISMISS_MS)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <SuccessToast message={message} onClose={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>.')
  }
  return context
}
