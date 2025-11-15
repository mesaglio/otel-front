import { Link } from 'react-router-dom'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { Log } from '../../types/api'

interface LogTableProps {
  logs: Log[]
  searchQuery?: string
  onCopyLog?: (log: Log) => void
}

export function LogTable({ logs, searchQuery, onCopyLog }: LogTableProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const getSeverityColor = (severity: number) => {
    if (severity >= 21) return 'bg-red-600 text-white' // FATAL
    if (severity >= 17) return 'bg-red-100 text-red-800' // ERROR
    if (severity >= 13) return 'bg-yellow-100 text-yellow-800' // WARN
    if (severity >= 9) return 'bg-blue-100 text-blue-800' // INFO
    if (severity >= 5) return 'bg-gray-100 text-gray-800' // DEBUG
    return 'bg-gray-50 text-gray-600' // TRACE
  }

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
    const logText = `[${new Date(log.timestamp).toISOString()}] [${log.severity_text}] [${log.service_name}] ${log.body}`
    try {
      await navigator.clipboard.writeText(logText)
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
        className={`px-4 py-3 border-b border-gray-200 hover:bg-gray-50 ${
          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        }`}
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
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(
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
              onClick={() => handleCopyLog(log)}
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

