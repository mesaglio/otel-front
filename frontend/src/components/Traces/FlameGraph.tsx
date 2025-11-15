import { useMemo } from 'react'
import type { Span } from '../../types/api'
import { formatDuration } from '../../utils/format'

interface FlameGraphProps {
  spans: Span[]
  onSpanClick?: (span: Span) => void
}

interface FlameNode {
  name: string
  value: number
  duration: number
  count: number
  spans: Span[]
  children: Map<string, FlameNode>
}

function buildFlameData(spans: Span[]): FlameNode {
  const root: FlameNode = {
    name: 'root',
    value: 0,
    duration: 0,
    count: 0,
    spans: [],
    children: new Map(),
  }

  // Find the root span (the one without parent_span_id)
  const rootSpan = spans.find(s => !s.parent_span_id)
  if (!rootSpan) {
    return root // No root span found
  }

  // The total duration is the root span's duration
  const totalDuration = rootSpan.duration_ms

  // Group ALL spans by operation name
  const operationMap = new Map<string, { duration: number; count: number; spans: Span[] }>()

  spans.forEach((span) => {
    const key = `${span.service_name}::${span.operation_name}`
    if (!operationMap.has(key)) {
      operationMap.set(key, { duration: 0, count: 0, spans: [] })
    }
    const data = operationMap.get(key)!
    
    // Sum all durations for this operation
    data.duration += span.duration_ms
    data.count += 1
    data.spans.push(span)
  })

  // Convert to flame graph structure
  // Percentages will be calculated relative to the root span duration
  operationMap.forEach((data, key) => {
    const node: FlameNode = {
      name: key,
      value: data.duration,
      duration: data.duration,
      count: data.count,
      spans: data.spans,
      children: new Map(),
    }
    root.children.set(key, node)
  })

  // Set root totals to the root span duration
  root.duration = totalDuration
  root.value = totalDuration
  root.count = spans.length

  return root
}

export function FlameGraph({ spans, onSpanClick }: FlameGraphProps) {
  const flameData = useMemo(() => buildFlameData(spans), [spans])

  if (spans.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No spans to display
      </div>
    )
  }

  // Sort children by duration (descending)
  const sortedChildren = Array.from(flameData.children.values()).sort(
    (a, b) => b.duration - a.duration
  )

  const maxDuration = flameData.duration

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Flame Graph - Operation Duration Analysis
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Total duration: {formatDuration(maxDuration)} across {flameData.count} spans
        </p>
      </div>

      <div className="space-y-3">
        {sortedChildren.map((node) => {
          const widthPercent = (node.duration / maxDuration) * 100
          const avgDuration = node.duration / node.count
          const [service, operation] = node.name.split('::')

          // Determine color based on relative duration
          const getColor = () => {
            if (widthPercent > 70) return { bg: 'bg-red-500', text: 'text-red-700' }
            if (widthPercent > 40) return { bg: 'bg-yellow-500', text: 'text-yellow-700' }
            return { bg: 'bg-green-500', text: 'text-green-700' }
          }
          const colors = getColor()

          return (
            <div key={node.name} className="flex items-center gap-3">
              {/* Span info - always visible */}
              <div className="flex-shrink-0 w-80">
                <div className="text-sm font-semibold text-gray-900">{operation}</div>
                <div className="text-xs text-gray-500">{service}</div>
              </div>

              {/* Bar with stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4">
                  {/* Visual bar */}
                  <div className="flex-1 relative">
                    <div
                      className={`relative h-12 rounded-lg cursor-pointer transition-all hover:shadow-md hover:opacity-80 ${colors.bg}`}
                      style={{
                        width: `${Math.max(widthPercent, 2)}%`, // Minimum 2% width for visibility
                      }}
                      onClick={() => onSpanClick?.(node.spans[0])}
                    />
                  </div>

                  {/* Stats on the right */}
                  <div className="flex-shrink-0 w-48 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {formatDuration(node.duration)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {node.count} calls • {formatDuration(avgDuration)} avg
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${colors.text} w-16 text-right`}>
                        {widthPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-gray-600">Fast (&lt; 40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-gray-600">Medium (40-70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-gray-600">Slow (&gt; 70%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

