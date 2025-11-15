import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { BarChart3, Flame } from 'lucide-react'
import { useTrace } from '../../hooks/useTraces'
import { useLogsByTraceId } from '../../hooks/useLogs'
import { WaterfallView } from '../../components/Traces/WaterfallView'
import { SpanDetailsPanel } from '../../components/Traces/SpanDetailsPanel'
import { FlameGraph } from '../../components/Traces/FlameGraph'
import type { Span } from '../../types/api'

type ViewMode = 'waterfall' | 'flame'

export function TraceDetail() {
  const { id } = useParams<{ id: string }>()
  const { trace, loading, error } = useTrace(id || null)
  const { logs } = useLogsByTraceId(id || null)
  const [viewMode, setViewMode] = useState<ViewMode>('waterfall')
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null)

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading trace...</p>
        </div>
      </div>
    )
  }

  if (error || !trace) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error ? `Error: ${error.message}` : 'Trace not found'}
        </div>
        <Link to="/traces" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
          ← Back to Traces
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link
          to="/traces"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Traces
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Trace Details</h1>
        <div className="mt-4 bg-white shadow rounded-lg p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Trace ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{trace.trace_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Service</dt>
              <dd className="mt-1 text-sm text-gray-900">{trace.service_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Operation</dt>
              <dd className="mt-1 text-sm text-gray-900">{trace.operation_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Duration</dt>
              <dd className="mt-1 text-sm text-gray-900">{trace.duration_ms}ms</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Time</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(trace.start_time).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Span Count</dt>
              <dd className="mt-1 text-sm text-gray-900">{trace.span_count}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* View mode selector */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Spans</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('waterfall')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                viewMode === 'waterfall'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <BarChart3 size={18} />
              <span>Waterfall</span>
            </button>
            <button
              onClick={() => setViewMode('flame')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                viewMode === 'flame'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Flame size={18} />
              <span>Flame Graph</span>
            </button>
          </div>
        </div>

        {/* Waterfall View */}
        {viewMode === 'waterfall' && (
          <WaterfallView spans={trace.spans} onSpanClick={setSelectedSpan} />
        )}

        {/* Flame Graph View */}
        {viewMode === 'flame' && (
          <FlameGraph spans={trace.spans} onSpanClick={setSelectedSpan} />
        )}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Logs</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {logs.map((log) => (
                <li key={log.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.severity >= 17
                              ? 'bg-red-100 text-red-800'
                              : log.severity >= 13
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {log.severity_text}
                        </span>
                        <span className="ml-2 text-sm text-gray-900">{log.body}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {log.service_name} • {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Span Details Panel */}
      {selectedSpan && (
        <SpanDetailsPanel span={selectedSpan} onClose={() => setSelectedSpan(null)} />
      )}
    </div>
  )
}
