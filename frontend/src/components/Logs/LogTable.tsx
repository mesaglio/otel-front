import { Link } from 'react-router-dom'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { Log } from '../../types/api'
import { buildLogCopyText, getLogSeverityColor } from '../../utils/logs'

interface LogTableProps {
  logs: Log[]
  searchQuery?: string
  onCopyLog?: (log: Log) => void
  onSelectLog?: (log: Log) => void
  selectedLogId?: number | null
}

export function LogTable({
  logs,
  searchQuery,
  onCopyLog,
  onSelectLog,
  selectedLogId,
}: LogTableProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const highlightText = (text: string, query?: string) => {
    if (!query || query.trim() === '') return text

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    )
  }

  const handleCopyLog = async (log: Log) => {
    try {
      await navigator.clipboard.writeText(buildLogCopyText(log))
      setCopiedId(log.id)
      setTimeout(() => setCopiedId(null), 2000)
      onCopyLog?.(log)
    } catch (err) {
      console.error('Failed to copy log:', err)
    }
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const log = logs[index]

    return (
      <div
        style={style}
        className={`px-4 py-3 border-b border-gray-200 cursor-pointer transition-colors ${
          selectedLogId === log.id
            ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
            : index % 2 === 0
            ? 'bg-white hover:bg-gray-50'
            : 'bg-gray-50 hover:bg-gray-100'
        }`}
        onClick={() => onSelectLog?.(log)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelectLog?.(log)
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`View details for log ${log.id}`}
        aria-pressed={selectedLogId === log.id}
      >
        <div className="flex items-start gap-3">
          {/* Timestamp */}
          <div className="w-44 flex-shrink-0 text-xs text-gray-500 font-mono">
            {new Date(log.timestamp).toLocaleString([], {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>

          {/* Severity */}
          <div className="w-20 flex-shrink-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLogSeverityColor(
                log.severity
              )}`}
            >
              {log.severity_text}
            </span>
          </div>

          {/* Service */}
          <div className="w-36 flex-shrink-0">
            <span className="text-sm font-medium text-gray-900 truncate block">
              {log.service_name}
            </span>
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900">
              {highlightText(log.body, searchQuery)}
            </div>

            {/* Trace link */}
            {log.trace_id && (
              <div className="mt-1 flex items-center gap-2">
                <Link
                  to={`/traces/${log.trace_id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={12} />
                  View Trace
                </Link>
                <span className="text-xs text-gray-400 font-mono">
                  {log.trace_id.substring(0, 16)}...
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="w-10 flex-shrink-0">
            <button
              onClick={(event) => {
                event.stopPropagation()
                void handleCopyLog(log)
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Copy log entry"
            >
              {copiedId === log.id ? (
                <Check size={16} className="text-green-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">No logs found matching the current filters</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
          <div className="w-44 flex-shrink-0">Timestamp</div>
          <div className="w-20 flex-shrink-0">Severity</div>
          <div className="w-36 flex-shrink-0">Service</div>
          <div className="flex-1">Message</div>
          <div className="w-10 flex-shrink-0"></div>
        </div>
      </div>

      {/* Log list with scroll */}
      <div className="max-h-[600px] overflow-y-auto">
        {logs.map((log, index) => (
          <Row key={log.id} index={index} style={{}} />
        ))}
      </div>
    </div>
  )
}
