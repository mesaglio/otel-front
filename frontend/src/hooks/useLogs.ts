import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/api'
import type { Log, LogFilters } from '../types/api'

export function useLogs(filters?: LogFilters) {
  const [logs, setLogs] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getLogs(filters)
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch logs'))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return {
    logs,
    total,
    loading,
    error,
    refetch: fetchLogs,
  }
}

export function useLogsByTraceId(traceId: string | null) {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!traceId) {
      setLogs([])
      return
    }

    setLoading(true)
    setError(null)
    apiClient
      .getLogsByTraceId(traceId)
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch logs')))
      .finally(() => setLoading(false))
  }, [traceId])

  return {
    logs,
    loading,
    error,
  }
}
