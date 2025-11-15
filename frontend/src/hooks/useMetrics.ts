import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/api'
import type { Metric, MetricFilters, MetricAggregation, AggregationRequest } from '../types/api'

export function useMetrics(filters?: MetricFilters) {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getMetrics(filters)
      setMetrics(data.metrics)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  }
}

export function useMetricNames(service?: string) {
  const [names, setNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    apiClient
      .getMetricNames(service)
      .then((data) => setNames(data.names))
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch metric names')))
      .finally(() => setLoading(false))
  }, [service])

  return {
    names,
    loading,
    error,
  }
}

export function useMetricAggregation(request: AggregationRequest | null) {
  const [results, setResults] = useState<MetricAggregation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!request) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)
    apiClient
      .aggregateMetrics(request)
      .then((data) => setResults(data.results))
      .catch((err) =>
        setError(err instanceof Error ? err : new Error('Failed to aggregate metrics'))
      )
      .finally(() => setLoading(false))
  }, [request])

  return {
    results,
    loading,
    error,
  }
}
