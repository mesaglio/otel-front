import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useLogs } from '../hooks/useLogs'
import { useServices } from '../hooks/useServices'
import { LogFiltersBar } from '../components/Logs/LogFiltersBar'
import { LogTable } from '../components/Logs/LogTable'
import type { LogFilters } from '../types/api'

export function Logs() {
  const [filters, setFilters] = useState<LogFilters>({ limit: 100 })
  const { logs, total, loading, error } = useLogs(filters)
  const { services } = useServices()

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Search and filter application logs with full-text search
          </p>
        </div>
        {logs.length > 0 && (
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{logs.length}</span> of{' '}
            <span className="font-semibold">{total}</span> logs
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <LogFiltersBar filters={filters} onFiltersChange={setFilters} services={services} />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error.message}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
          <p className="text-gray-600">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
          <p className="text-gray-500">
            {filters.search || filters.service || filters.trace_id
              ? 'Try adjusting your filters'
              : 'Start sending logs to see them here'}
          </p>
        </div>
      ) : (
        <LogTable logs={logs} searchQuery={filters.search} />
      )}
    </div>
  )
}
