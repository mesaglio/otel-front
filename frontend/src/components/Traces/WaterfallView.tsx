import { useMemo, useState } from 'react'
import type { Span } from '../../types/api'
import { formatDuration } from '../../utils/format'

interface WaterfallViewProps {
  spans: Span[]
  onSpanClick?: (span: Span) => void
}

interface SpanHierarchy extends Span {
  children: SpanHierarchy[]
  level: number
}

// Service colors for visual distinction
const SERVICE_COLORS: Record<string, string> = {}
const COLOR_PALETTE = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-cyan-500',
]

function getServiceColor(serviceName: string): string {
  if (!SERVICE_COLORS[serviceName]) {
    const colorIndex = Object.keys(SERVICE_COLORS).length % COLOR_PALETTE.length
    SERVICE_COLORS[serviceName] = COLOR_PALETTE[colorIndex]
  }
  return SERVICE_COLORS[serviceName]
}

function buildSpanHierarchy(spans: Span[]): SpanHierarchy[] {
  const spanMap = new Map<string, SpanHierarchy>()
  const rootSpans: SpanHierarchy[] = []

  // Create initial map
  spans.forEach((span) => {
    spanMap.set(span.span_id, { ...span, children: [], level: 0 })
  })

  // Build hierarchy
  spans.forEach((span) => {
    const current = spanMap.get(span.span_id)!
    if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
      const parent = spanMap.get(span.parent_span_id)!
      parent.children.push(current)
      current.level = parent.level + 1
    } else {
      rootSpans.push(current)
    }
  })

  // Sort by start time
  const sortByStartTime = (a: SpanHierarchy, b: SpanHierarchy) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  }

  rootSpans.sort(sortByStartTime)
  const sortChildren = (span: SpanHierarchy) => {
    span.children.sort(sortByStartTime)
    span.children.forEach(sortChildren)
  }
  rootSpans.forEach(sortChildren)

  return rootSpans
}

function flattenHierarchy(spans: SpanHierarchy[]): SpanHierarchy[] {
  const result: SpanHierarchy[] = []
  const traverse = (span: SpanHierarchy) => {
    result.push(span)
    span.children.forEach(traverse)
  }
  spans.forEach(traverse)
  return result
}

export function WaterfallView({ spans, onSpanClick }: WaterfallViewProps) {
  const [hoveredSpan, setHoveredSpan] = useState<string | null>(null)

  const { flatSpans, timelineData } = useMemo(() => {
    if (spans.length === 0) {
      return { flatSpans: [], timelineData: { minTime: 0, maxTime: 0, duration: 0 } }
    }

    const hierarchy = buildSpanHierarchy(spans)
    const flatSpans = flattenHierarchy(hierarchy)

    // Calculate timeline bounds
    const times = spans.map((s) => new Date(s.start_time).getTime())
    const minTime = Math.min(...times)
    const maxTime = Math.max(
      ...spans.map((s) => new Date(s.start_time).getTime() + s.duration_ms)
    )
    const duration = maxTime - minTime

    return {
      flatSpans,
      timelineData: { minTime, maxTime, duration },
    }
  }, [spans])

  if (spans.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No spans to display
      </div>
    )
  }

  const getSpanPosition = (span: Span) => {
    const startTime = new Date(span.start_time).getTime()
    const left = ((startTime - timelineData.minTime) / timelineData.duration) * 100
    const width = (span.duration_ms / timelineData.duration) * 100
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Timeline Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Duration: {timelineData.duration.toFixed(2)}ms</span>
          <span>{spans.length} spans</span>
        </div>
      </div>

      {/* Waterfall */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Timeline scale */}
          <div className="relative h-8 bg-gray-50 border-b border-gray-200">
            <div className="absolute inset-0 flex justify-between px-4 items-center text-xs text-gray-500">
              <span>0ms</span>
              <span>{(timelineData.duration / 4).toFixed(0)}ms</span>
              <span>{(timelineData.duration / 2).toFixed(0)}ms</span>
              <span>{((timelineData.duration * 3) / 4).toFixed(0)}ms</span>
              <span>{timelineData.duration.toFixed(0)}ms</span>
            </div>
          </div>

          {/* Span rows */}
          <div className="divide-y divide-gray-100">
            {flatSpans.map((span) => {
              const position = getSpanPosition(span)
              const isHovered = hoveredSpan === span.span_id
              const serviceColor = getServiceColor(span.service_name)

              return (
                <div
                  key={span.span_id}
                  className={`relative h-12 flex items-center hover:bg-gray-50 cursor-pointer transition-colors ${
                    isHovered ? 'bg-blue-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredSpan(span.span_id)}
                  onMouseLeave={() => setHoveredSpan(null)}
                  onClick={() => onSpanClick?.(span)}
                >
                  {/* Span name */}
                  <div
                    className="flex-shrink-0 px-4 text-sm text-gray-700 overflow-hidden whitespace-nowrap"
                    style={{
                      width: '250px',
                      paddingLeft: `${16 + span.level * 20}px`,
                    }}
                  >
                    <span className="font-medium">{span.operation_name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {span.service_name}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 relative h-full">
                    <div className="absolute inset-0 mx-4 flex items-center">
                      {/* Span bar */}
                      <div className="flex-1 relative">
                        <div
                          className="absolute h-6 rounded shadow-sm transition-all hover:shadow-md hover:opacity-80"
                          style={{
                            left: position.left,
                            width: position.width,
                          }}
                        >
                          <div
                            className={`h-full rounded ${serviceColor} ${
                              span.status_code === 'ERROR' ? 'opacity-75 ring-2 ring-red-500' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Stats on the right */}
                      <div className="flex-shrink-0 w-32 flex items-center justify-end gap-2 ml-4">
                        <div className="text-xs font-bold text-gray-900">
                          {formatDuration(span.duration_ms)}
                        </div>
                        {span.status_code === 'ERROR' && (
                          <span className="text-red-600 text-sm">⚠</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex flex-wrap gap-4">
          {Object.entries(SERVICE_COLORS).map(([service, color]) => (
            <div key={service} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${color}`}></div>
              <span className="text-sm text-gray-700">{service}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

