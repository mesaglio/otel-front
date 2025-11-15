import { useState, useEffect } from 'react'
import { apiClient } from '../services/api'
import type { Service } from '../types/api'

export function useServices() {
  const [services, setServices] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    apiClient
      .getServices()
      .then((data: Service[]) => setServices(data.map((s) => s.service_name)))
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch services')))
      .finally(() => setLoading(false))
  }, [])

  return {
    services,
    loading,
    error,
  }
}


