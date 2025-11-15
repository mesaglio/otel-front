import { useState } from 'react'
import { X, ArrowLeftRight, ChevronDown, ChevronRight } from 'lucide-react'
import type { TraceDetail, Span } from '../../types/api'
import { formatDuration } from '../../utils/format'

interface TraceComparisonProps {
  traces: TraceDetail[]
  onClose: () => void
}

export function TraceComparison({ traces, onClose }: TraceComparisonProps) {
  const [selectedTraces, setSelectedTraces] = useState<TraceDetail[]>(traces.slice(0, 2))
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  if (traces.length < 2) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          Please select at least 2 traces to compare.
        </p>
      </div>
    )
  }

  const compareSpans = (trace1: TraceDetail, trace2: TraceDetail) => {
    const spans1Map = new Map(trace1.spans.map((s) => [s.operation_name, s]))
    const spans2Map = new Map(trace2.spans.map((s) => [s.operation_name, s]))

    const allOperations = new Set([...spans1Map.keys(), ...spans2Map.keys()])

    return Array.from(allOperations).map((operation) => {
      const span1 = spans1Map.get(operation)
      const span2 = spans2Map.get(operation)

      return {
        operation,
        span1,
        span2,
        diff: span1 && span2 ? span2.duration_ms - span1.duration_ms : null,
        diffPercent:
          span1 && span2 ? ((span2.duration_ms - span1.duration_ms) / span1.duration_ms) * 100 : null,
      }
    })
  }

  const comparison = compareSpans(selectedTraces[0], selectedTraces[1])

  const toggleRow = (operation: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(operation)) {
        newSet.delete(operation)
      } else {
        newSet.add(operation)
      }
      return newSet
    })
  }

  const compareAttributes = (span1: Span | undefined, span2: Span | undefined) => {
    if (!span1 && !span2) return []

    const attrs1 = span1?.attributes || {}
    const attrs2 = span2?.attributes || {}
    const allKeys = new Set([...Object.keys(attrs1), ...Object.keys(attrs2)])

    return Array.from(allKeys).map((key) => {
      const val1 = attrs1[key]
      const val2 = attrs2[key]
      const isDifferent = JSON.stringify(val1) !== JSON.stringify(val2)

      return {
        key,
        value1: val1,
        value2: val2,
        isDifferent,
        onlyInTrace1: val1 !== undefined && val2 === undefined,
        onlyInTrace2: val1 === undefined && val2 !== undefined,
      }
    })
  }

  const formatValue = (value: any): string => {
    if (value === undefined) return '-'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Trace Comparison</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Trace selectors */}
        <div className="border-b border-gray-200 px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trace 1 (Baseline)
            </label>
            <select
              value={selectedTraces[0]?.trace_id || ''}
              onChange={(e) => {
                const trace = traces.find((t) => t.trace_id === e.target.value)
                if (trace) {
                  setSelectedTraces([trace, selectedTraces[1]])
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {traces.map((trace) => (
                <option key={trace.trace_id} value={trace.trace_id}>
                  {trace.operation_name} - {trace.duration_ms}ms ({trace.service_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trace 2 (Compare)
            </label>
            <select
              value={selectedTraces[1]?.trace_id || ''}
              onChange={(e) => {
                const trace = traces.find((t) => t.trace_id === e.target.value)
                if (trace) {
                  setSelectedTraces([selectedTraces[0], trace])
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {traces.map((trace) => (
                <option key={trace.trace_id} value={trace.trace_id}>
                  {trace.operation_name} - {trace.duration_ms}ms ({trace.service_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Statistics */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Duration Diff</div>
              <div
                className={`text-2xl font-bold ${
                  selectedTraces[1].duration_ms > selectedTraces[0].duration_ms
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {selectedTraces[1].duration_ms > selectedTraces[0].duration_ms ? '+' : ''}
                {formatDuration(selectedTraces[1].duration_ms - selectedTraces[0].duration_ms)}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Percentage Change</div>
              <div
                className={`text-2xl font-bold ${
                  selectedTraces[1].duration_ms > selectedTraces[0].duration_ms
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {selectedTraces[1].duration_ms > selectedTraces[0].duration_ms ? '+' : ''}
                {(
                  ((selectedTraces[1].duration_ms - selectedTraces[0].duration_ms) /
                    selectedTraces[0].duration_ms) *
                  100
                ).toFixed(1)}
                %
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Span Count Diff</div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedTraces[0].span_count} → {selectedTraces[1].span_count}
              </div>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trace 1
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trace 2
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diff
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comparison.map((row) => {
                const isExpanded = expandedRows.has(row.operation)
                const attributes = compareAttributes(row.span1, row.span2)
                const hasDifferences = attributes.some((attr) => attr.isDifferent)

                return (
                  <>
                    <tr
                      key={row.operation}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRow(row.operation)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                          <span>{row.operation}</span>
                          {hasDifferences && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Has differences
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {row.span1 ? (
                          <span className="text-gray-900">{formatDuration(row.span1.duration_ms)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {row.span2 ? (
                          <span className="text-gray-900">{formatDuration(row.span2.duration_ms)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {row.diff !== null ? (
                          <span
                            className={`font-medium ${
                              row.diff > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {row.diff > 0 ? '+' : ''}
                            {formatDuration(row.diff)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {row.diffPercent !== null ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              row.diffPercent > 10
                                ? 'bg-red-100 text-red-800'
                                : row.diffPercent < -10
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {row.diffPercent > 0 ? '+' : ''}
                            {row.diffPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded attributes section */}
                    {isExpanded && (
                      <tr key={`${row.operation}-details`}>
                        <td colSpan={5} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-700">Attributes Comparison</h4>
                            
                            {attributes.length === 0 ? (
                              <p className="text-sm text-gray-500">No attributes to compare</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                        Attribute
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                        Trace 1 Value
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                        Trace 2 Value
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {attributes.map((attr) => (
                                      <tr
                                        key={attr.key}
                                        className={
                                          attr.isDifferent
                                            ? 'bg-yellow-50'
                                            : ''
                                        }
                                      >
                                        <td className="px-3 py-2 font-mono text-xs text-gray-700 font-medium">
                                          {attr.key}
                                          {attr.onlyInTrace1 && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                              Only in Trace 1
                                            </span>
                                          )}
                                          {attr.onlyInTrace2 && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                              Only in Trace 2
                                            </span>
                                          )}
                                        </td>
                                        <td
                                          className={`px-3 py-2 font-mono text-xs ${
                                            attr.isDifferent && !attr.onlyInTrace2
                                              ? 'bg-red-50 text-red-900 font-semibold'
                                              : 'text-gray-900'
                                          }`}
                                        >
                                          {formatValue(attr.value1)}
                                        </td>
                                        <td
                                          className={`px-3 py-2 font-mono text-xs ${
                                            attr.isDifferent && !attr.onlyInTrace1
                                              ? 'bg-green-50 text-green-900 font-semibold'
                                              : 'text-gray-900'
                                          }`}
                                        >
                                          {formatValue(attr.value2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

