import { MetricWidget } from './MetricWidget'
import type { WidgetConfig } from './MetricWidget'

interface DashboardGridProps {
  widgets: WidgetConfig[]
  onRemoveWidget?: (id: string) => void
}

export function DashboardGrid({ widgets, onRemoveWidget }: DashboardGridProps) {
  if (widgets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <p className="text-gray-500 text-lg mb-2">No widgets configured</p>
        <p className="text-gray-400 text-sm">
          Select a template or add widgets using the Query Builder
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {widgets.map((widget) => (
        <MetricWidget key={widget.id} config={widget} onRemove={onRemoveWidget} />
      ))}
    </div>
  )
}


