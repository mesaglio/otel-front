import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { useTraces } from '../../hooks/useTraces'
import { TraceFiltersBar } from '../../components/Traces/TraceFiltersBar'
import { TraceComparison } from '../../components/Traces/TraceComparison'
import type { TraceFilters, TraceDetail } from '../../types/api'
import { apiClient } from '../../services/api'
import { formatDuration } from '../../utils/format'

export function TracesList() {
  const [filters, setFilters] = useState<TraceFilters>({ limit: 100 })
  const { traces, loading, error } = useTraces(filters)
  const [selectedTraces, setSelectedTraces] = useState<string[]>([])
  const [showComparison, setShowComparison] = useState(false)
  const [services, setServices] = useState<string[]>([])
  const [selectedTraceDetails, setSelectedTraceDetails] = useState<TraceDetail[]>([])

  useEffect(() => {
    apiClient
      .getServices()
      .then((data) => setServices(data.map((s) => s.service_name)))
      .catch((err: Error) => console.error('Failed to fetch services:', err))
  }, [])

  // Fetch full trace details when comparison is triggered
  useEffect(() => {
    if (showComparison && selectedTraces.length >= 2) {
      Promise.all(selectedTraces.map((id) => apiClient.getTraceById(id)))
        .then(setSelectedTraceDetails)
        .catch((err: Error) => console.error('Failed to fetch trace details:', err))
    }
  }, [showComparison, selectedTraces])

  const handleTraceSelection = (traceId: string) => {
    setSelectedTraces((prev) => {
      if (prev.includes(traceId)) {
        return prev.filter((id) => id !== traceId)
      } else if (prev.length < 4) {
        // Limit to 4 traces
        return [...prev, traceId]
      }
      return prev
    })
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Traces</h1>
        {selectedTraces.length >= 2 && (
          <button
            onClick={() => setShowComparison(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftRight size={18} />
            <span>Compare {selectedTraces.length} Traces</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <TraceFiltersBar filters={filters} onFiltersChange={setFilters} services={services} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error.message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading traces...</p>
        </div>
      ) : traces.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No traces found</p>
        </div>
      ) : (
        <>
          {/* Selection info */}
          {selectedTraces.length > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-800">
                  {selectedTraces.length} trace(s) selected for comparison
                </span>
                <button
                  onClick={() => setSelectedTraces([])}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {traces.map((trace) => {
                const isSelected = selectedTraces.includes(trace.trace_id)
                return (
                  <li key={trace.id} className={isSelected ? 'bg-blue-50' : ''}>
                    <div className="flex items-center px-4 py-4 sm:px-6">
                      {/* Checkbox for comparison */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTraceSelection(trace.trace_id)}
                        className="mr-4 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!isSelected && selectedTraces.length >= 4}
                      />

                      <Link
                        to={`/traces/${trace.trace_id}`}
                        className="flex-1 block hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              {trace.has_errors ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Error
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  OK
                                </span>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {trace.operation_name}
                              </div>
                              <div className="text-sm text-gray-500">{trace.service_name}</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            <div>{formatDuration(trace.duration_ms)}</div>
                            <div>{trace.span_count} spans</div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}

      {/* Comparison Modal */}
      {showComparison && selectedTraceDetails.length >= 2 && (
        <TraceComparison
          traces={selectedTraceDetails}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  )
}
