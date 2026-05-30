import { flatten } from 'flat'
import type { Log } from '../types/api'

export interface LogFieldEntry {
  key: string
  value: string
}

export interface ParsedLogBody {
  title: string
  entries: LogFieldEntry[]
  rawBody: string
}

const TITLE_KEYS = ['message', 'msg', 'event', 'error', 'title']

function stringifyFieldValue(value: unknown): string {
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {}
  }
  return String(value);
}

function truncateText(text: string, maxLength = 80): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

function deriveTitleFromObject(value: Record<string, unknown>): string | null {
  for (const key of TITLE_KEYS) {
    const candidate = value[key]
    if (typeof candidate === 'string' && candidate.trim()) {
      return truncateText(candidate.trim())
    }
  }

  return null
}

function flattenValue(value: Record<string, unknown> | unknown[]): LogFieldEntry[] {
  const flattened = flatten(value, { safe: true }) as Record<string, unknown>

  return Object.entries(flattened).map(([key, entryValue]) => ({
    key,
    value: stringifyFieldValue(entryValue),
  }))
}

export function flattenLogFields(fields: Record<string, unknown>): LogFieldEntry[] {
  if (Object.keys(fields).length === 0) return []
  return flattenValue(fields)
}

export function parseLogBody(body: string): ParsedLogBody {
  try {
    const parsed = JSON.parse(body) as unknown

    if (Array.isArray(parsed)) {
      return {
        title: 'Structured Log',
        entries: flattenValue(parsed),
        rawBody: body,
      }
    }

    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>

      return {
        title: deriveTitleFromObject(record) ?? 'Structured Log',
        entries: flattenValue(record),
        rawBody: body,
      }
    }
  } catch {
    // Fall back to raw body rendering below.
  }

  const rawBody = body.trim()
  return {
    title: rawBody ? truncateText(rawBody) : 'Log Details',
    entries: [{ key: 'message', value: body || 'N/A' }],
    rawBody: body,
  }
}

export function getLogSeverityColor(severity: number): string {
  if (severity >= 21) return 'bg-red-600 text-white'
  if (severity >= 17) return 'bg-red-100 text-red-800'
  if (severity >= 13) return 'bg-yellow-100 text-yellow-800'
  if (severity >= 9) return 'bg-blue-100 text-blue-800'
  if (severity >= 5) return 'bg-gray-100 text-gray-800'
  return 'bg-gray-50 text-gray-600'
}

export function buildLogCopyText(log: Log): string {
  return `[${new Date(log.timestamp).toISOString()}] [${log.severity_text}] [${log.service_name}] ${log.body}`
}
