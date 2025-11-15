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


