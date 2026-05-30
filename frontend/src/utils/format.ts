/**
 * Format duration in milliseconds to a human-readable string
 * - If >= 1000ms, show in seconds (e.g., "5.43s")
 * - If < 1000ms, show in milliseconds (e.g., "234.50ms")
 */
export function formatDuration(durationMs: number): string {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)}s`
  }
  return `${durationMs.toFixed(2)}ms`
}

/**
 * Format duration with high precision (3 decimals)
 */
export function formatDurationPrecise(durationMs: number): string {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(3)}s`
  }
  return `${durationMs.toFixed(3)}ms`
}

/**
 * Format ISO timestamps with second precision plus the original fractional part when present.
 */
export function formatTimestampPrecise(timestamp: string): string {
  if (!timestamp) return 'N/A'

  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return 'Invalid'

  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const fractionalMatch = timestamp.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})?$/)
  if (!fractionalMatch) return time

  return `${time}.${fractionalMatch[1].slice(0, 6)}`
}
