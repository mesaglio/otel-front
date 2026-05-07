import { useState, useEffect } from 'react'
import { apiClient } from '../services/api'

export function useServices() {
  const [services, setServices] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    apiClient
      .getServices()
      .then((data) => setServices(data))
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch services')))
      .finally(() => setLoading(false))
  }, [])

  return {
    services,
    loading,
    error,
  }
}
