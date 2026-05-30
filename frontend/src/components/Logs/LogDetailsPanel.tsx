import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Log } from '../../types/api'
import { formatTimestampPrecise } from '../../utils/format'
import { flattenLogFields, getLogSeverityColor, parseLogBody } from '../../utils/logs'

interface LogDetailsPanelProps {
  log: Log | null
  onClose: () => void
}

interface KeyValueSectionProps {
  title: string
  entries: Array<{ key: string; value: string }>
}

function KeyValueSection({ title, entries }: KeyValueSectionProps) {
  if (entries.length === 0) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="bg-gray-50 rounded-lg p-4">
        <dl className="space-y-3">
          {entries.map(({ key, value }) => (
            <div key={key} className="flex flex-col">
              <dt className="text-xs font-medium text-gray-600">{key}</dt>
              <dd className="text-sm text-gray-900 font-mono mt-1 break-all whitespace-pre-wrap">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

export function LogDetailsPanel({ log, onClose }: LogDetailsPanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const bodyDetails = useMemo(() => (log ? parseLogBody(log.body) : null), [log])

  if (!log || !bodyDetails) return null

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy field:', error)
    }
  }

  const identifierRows = [
    { label: 'Log ID', value: String(log.id), field: 'log_id' },
    ...(log.trace_id ? [{ label: 'Trace ID', value: log.trace_id, field: 'trace_id' }] : []),
    ...(log.span_id ? [{ label: 'Span ID', value: log.span_id, field: 'span_id' }] : []),
  ]

  const attributeEntries = flattenLogFields(log.attributes ?? {})
  const resourceEntries = flattenLogFields(log.resource_attributes ?? {})

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 break-words">{bodyDetails.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{log.service_name}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close log details panel"
        >
          <X size={24} />
        </button>
      </div>

      <div className="px-6 py-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Severity</h3>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLogSeverityColor(
              log.severity
            )}`}
          >
            {log.severity_text}
          </span>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Timing</h3>
          <dl className="space-y-2">
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-gray-500">Timestamp</dt>
              <dd className="text-gray-900 font-medium text-right">
                {formatTimestampPrecise(log.timestamp)}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Identifiers</h3>
          <div className="space-y-3">
            {identifierRows.map(({ label, value, field }) => (
              <div key={field}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">{label}</span>
                  <button
                    onClick={() => copyToClipboard(value, field)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={`Copy ${label}`}
                  >
                    {copiedField === field ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
                <code className="block text-xs font-mono bg-gray-50 p-2 rounded break-all">
                  {value}
                </code>
              </div>
            ))}
          </div>
        </div>

        {log.trace_id && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Correlation</h3>
            <Link
              to={`/traces/${log.trace_id}`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink size={14} />
              View related trace
            </Link>
          </div>
        )}

        <KeyValueSection title="Body" entries={bodyDetails.entries} />
        <KeyValueSection title="Attributes" entries={attributeEntries} />
        <KeyValueSection title="Resource Attributes" entries={resourceEntries} />
      </div>
    </div>
  )
}
