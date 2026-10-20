import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

/**
 * Fetches a single issue by id. A 404 is exposed as `notFound: true`
 * instead of a generic error so pages can render a dedicated state.
 */
export function useIssue(id) {
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (id === null || id === undefined || id === '' || Number.isNaN(Number(id))) {
      setLoading(false)
      setNotFound(true)
      setError(null)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setNotFound(false)

    api
      .getIssue(id)
      .then((data) => {
        if (cancelled) return
        setIssue(data)
        setNotFound(!data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err.status === 404) {
          setNotFound(true)
        } else {
          setError(err)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, version])

  return { issue, loading, error, notFound, reload }
}
