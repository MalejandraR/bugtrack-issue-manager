import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

/**
 * Fetches the issue list for the given filters (all optional).
 * Refetches whenever a filter changes or `reload()` is called.
 */
export function useIssues({ status = '', priority = '', severity = '' } = {}) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api
      .listIssues({ status, priority, severity })
      .then((data) => {
        if (!cancelled) setIssues(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, priority, severity, version])

  return { issues, loading, error, reload }
}
