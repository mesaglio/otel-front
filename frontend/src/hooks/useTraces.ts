import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/api'
import type { Trace, TraceDetail, TraceFilters } from '../types/api'

export function useTraces(filters?: TraceFilters) {
  const [traces, setTraces] = useState<Trace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTraces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getTraces(filters)
      setTraces(data.traces)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch traces'))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTraces()
  }, [fetchTraces])

  return {
    traces,
    loading,
    error,
    refetch: fetchTraces,
  }
}

export function useTrace(id: string | null) {
  const [trace, setTrace] = useState<TraceDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) {
      setTrace(null)
      return
    }

    setLoading(true)
    setError(null)
    apiClient
      .getTraceById(id)
      .then(setTrace)
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch trace')))
      .finally(() => setLoading(false))
  }, [id])

  return {
    trace,
    loading,
    error,
  }
}
