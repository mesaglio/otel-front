import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { Span } from '../../types/api'
import { formatDurationPrecise } from '../../utils/format'

interface SpanDetailsPanelProps {
  span: Span | null
  onClose: () => void
}

export function SpanDetailsPanel({ span, onClose }: SpanDetailsPanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!span) return null

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Format timestamp with microsecond precision
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const time = date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    // Get microseconds from ISO string
    const isoStr = date.toISOString()
    const microseconds = isoStr.slice(20, 26) // Gets ".123456" part
    return `${time}${microseconds}`
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{span.operation_name}</h2>
          <p className="text-sm text-gray-500 mt-1">{span.service_name}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-6">
        {/* Status */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              span.status_code === 'ERROR'
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {span.status_code}
          </span>
          {span.status_message && (
            <p className="mt-2 text-sm text-gray-600">{span.status_message}</p>
          )}
        </div>

        {/* Timing */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Timing</h3>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Duration</dt>
              <dd className="text-gray-900 font-medium">{formatDurationPrecise(span.duration_ms)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Start Time</dt>
              <dd className="text-gray-900 font-medium">{formatTimestamp(span.start_time)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">End Time</dt>
              <dd className="text-gray-900 font-medium">{formatTimestamp(span.end_time)}</dd>
            </div>
          </dl>
        </div>

        {/* IDs */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Identifiers</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Span ID</span>
                <button
                  onClick={() => copyToClipboard(span.span_id, 'span_id')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {copiedField === 'span_id' ? (
                    <Check size={14} className="text-green-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
              <code className="block text-xs font-mono bg-gray-50 p-2 rounded break-all">
                {span.span_id}
              </code>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Trace ID</span>
                <button
                  onClick={() => copyToClipboard(span.trace_id, 'trace_id')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {copiedField === 'trace_id' ? (
                    <Check size={14} className="text-green-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
              <code className="block text-xs font-mono bg-gray-50 p-2 rounded break-all">
                {span.trace_id}
              </code>
            </div>
            {span.parent_span_id && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Parent Span ID</span>
                  <button
                    onClick={() => copyToClipboard(span.parent_span_id!, 'parent_span_id')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedField === 'parent_span_id' ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
                <code className="block text-xs font-mono bg-gray-50 p-2 rounded break-all">
                  {span.parent_span_id}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Attributes */}
        {Object.keys(span.attributes).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Attributes</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="space-y-2">
                {Object.entries(span.attributes).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <dt className="text-xs font-medium text-gray-600">{key}</dt>
                    <dd className="text-sm text-gray-900 font-mono mt-1 break-all">
                      {typeof value === 'object'
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* Events */}
        {span.events && span.events.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Events</h3>
            <div className="space-y-3">
              {span.events.map((event: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {event.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {event.attributes && Object.keys(event.attributes).length > 0 && (
                    <dl className="space-y-1 mt-2">
                      {Object.entries(event.attributes).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <dt className="inline text-gray-600">{key}: </dt>
                          <dd className="inline text-gray-900 font-mono">
                            {String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Service</h3>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {span.service_name}
          </span>
        </div>
      </div>
    </div>
  )
}

