import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Search,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { useMetrics } from '../../hooks/useMetrics'
import type { Metric, MetricFilters } from '../../types/api'

interface MetricsExplorerProps {
  metricNames: string[]
  services: string[]
}

const METRIC_TYPES = ['gauge', 'sum', 'histogram', 'exponential_histogram']
const LIMITS = [50, 100, 250, 500]

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatValue(value: number | undefined): string {
  if (value === undefined || value === null) return '—'
  if (Number.isInteger(value)) return value.toLocaleString()
  return value.toFixed(4).replace(/\.?0+$/, '')
}

/**
 * Tokenizes a JSON string into spans with syntax-coloring classes.
 * Handles keys, strings, numbers, booleans, and null.
 */
function JsonHighlight({ value }: { value: unknown }) {
  const raw = JSON.stringify(value, null, 2)

  // Replace tokens with colored spans
  const html = raw.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-amber-600' // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-blue-700 font-medium' // key
        } else {
          cls = 'text-green-700' // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-purple-600'
      } else if (/null/.test(match)) {
        cls = 'text-gray-400'
      }
      return `<span class="${cls}">${match}</span>`
    }
  )

  return (
    <pre
      className="bg-gray-50 border border-gray-200 rounded p-3 font-mono text-xs overflow-x-auto leading-relaxed"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function MetricRow({ metric }: { metric: Metric }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(metric, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard errors
    }
  }

  const hasAttributes = metric.attributes && Object.keys(metric.attributes).length > 0
  const hasExemplars = metric.exemplars && metric.exemplars.length > 0
  const hasDetail = hasAttributes || hasExemplars

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${hasDetail ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetail && setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 w-8">
          {hasDetail && (
            <span className="text-gray-400">
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
          {formatTimestamp(metric.timestamp)}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">
          {metric.metric_name}
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
            {metric.metric_type}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">
          {metric.service_name}
        </td>
        <td className="px-4 py-3 text-sm font-mono text-right text-gray-900">
          {formatValue(metric.value)}
          {metric.unit && (
            <span className="ml-1 text-xs text-gray-400">{metric.unit}</span>
          )}
        </td>
      </tr>

      {expanded && hasDetail && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={6} className="px-6 pb-4 pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Metric Detail — ID {metric.id}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy()
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy JSON
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {hasAttributes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Attributes</p>
                  <JsonHighlight value={metric.attributes} />
                </div>
              )}

              {hasExemplars && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    Exemplars ({metric.exemplars!.length})
                  </p>
                  <div className="space-y-2">
                    {metric.exemplars!.map((ex, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 border border-gray-200 rounded p-3 text-xs"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-medium text-amber-600">
                            {formatValue(ex.value)}
                          </span>
                          <span className="text-gray-400 font-mono">
                            {formatTimestamp(ex.timestamp)}
                          </span>
                        </div>
                        {ex.trace_id && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-500">trace:</span>
                            <Link
                              to={`/traces/${ex.trace_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 font-mono text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {ex.trace_id.substring(0, 16)}…
                              <ExternalLink size={10} />
                            </Link>
                            {ex.span_id && (
                              <span className="text-gray-400 font-mono">
                                span: {ex.span_id.substring(0, 8)}…
                              </span>
                            )}
                          </div>
                        )}
                        {ex.attributes && Object.keys(ex.attributes).length > 0 && (
                          <div className="mt-2">
                            <JsonHighlight value={ex.attributes} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function MetricsExplorer({ metricNames, services }: MetricsExplorerProps) {
  const [filters, setFilters] = useState<MetricFilters>({ limit: 100 })

  const stableFilters = useMemo(() => filters, [filters])
  const { metrics, loading, error, refetch } = useMetrics(stableFilters)

  const handleFilterChange = (partial: Partial<MetricFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }))
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* Metric name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Metric Name</label>
            <select
              value={filters.name ?? ''}
              onChange={(e) => handleFilterChange({ name: e.target.value || undefined })}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All metrics</option>
              {metricNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type ?? ''}
              onChange={(e) => handleFilterChange({ type: e.target.value || undefined })}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All types</option>
              {METRIC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Service</label>
            <select
              value={filters.service ?? ''}
              onChange={(e) => handleFilterChange({ service: e.target.value || undefined })}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All services</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Limit</label>
            <select
              value={filters.limit ?? 100}
              onChange={(e) => handleFilterChange({ limit: Number(e.target.value) })}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LIMITS.map((l) => (
                <option key={l} value={l}>
                  {l} rows
                </option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <div className="flex items-end">
            <button
              onClick={refetch}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          Error: {error.message}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2" />
          <p className="text-gray-600 text-sm">Loading metrics...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && metrics.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No metrics found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your filters or send metrics to this collector.</p>
        </div>
      )}

      {/* Table */}
      {!loading && metrics.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{metrics.length}</span> metric{metrics.length !== 1 ? 's' : ''}
              {filters.limit && metrics.length === filters.limit && (
                <span className="ml-1">(limit reached — refine filters to narrow results)</span>
              )}
            </span>
            <span className="text-xs text-gray-400">Click a row to expand attributes &amp; exemplars</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-8 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Metric Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Service
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <MetricRow key={metric.id} metric={metric} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
