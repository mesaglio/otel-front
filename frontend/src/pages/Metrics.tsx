import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, Trash2, Save, Check } from 'lucide-react'
import { QueryBuilder } from '../components/Metrics/QueryBuilder'
import { DashboardGrid } from '../components/Metrics/DashboardGrid'
import { AlertsPanel, type Alert } from '../components/Metrics/AlertsPanel'
import { useMetricNames } from '../hooks/useMetrics'
import { useServices } from '../hooks/useServices'
import type { WidgetConfig } from '../components/Metrics/MetricWidget'
import type { AggregationRequest } from '../types/api'

const DASHBOARD_STORAGE_KEY = 'otel-front-metrics-dashboard'

export function Metrics() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isSaved, setIsSaved] = useState(false)
  const isInitialLoad = useRef(true)

  const { names: metricNames } = useMetricNames()
  const { services } = useServices()

  // Load dashboard from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_STORAGE_KEY)
      if (saved) {
        const parsedWidgets = JSON.parse(saved)
        
        // Check if widgets have the new structure (metricName property)
        if (parsedWidgets.length > 0 && !parsedWidgets[0].metricName) {
          // Old structure detected - clear it
          console.warn('Old dashboard structure detected. Clearing dashboard.')
          localStorage.removeItem(DASHBOARD_STORAGE_KEY)
        } else {
          // New structure - load it
          setWidgets(parsedWidgets as WidgetConfig[])
          setIsSaved(true)
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard from localStorage:', error)
      // If parsing fails, clear the corrupted data
      localStorage.removeItem(DASHBOARD_STORAGE_KEY)
    }
    // Mark initial load as complete after this effect
    isInitialLoad.current = false
  }, [])

  // Mark as unsaved when widgets change (except on initial load)
  useEffect(() => {
    // Skip the initial load when widgets are loaded from localStorage
    if (isInitialLoad.current) {
      return
    }
    
    // Mark as unsaved when widgets change
    if (widgets.length > 0) {
      setIsSaved(false)
    }
  }, [widgets])

  const handleExecuteQuery = (query: AggregationRequest) => {
    // Calculate time range in minutes from query timestamps
    const startTime = new Date(query.start_time)
    const endTime = new Date(query.end_time)
    const timeRangeMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000))

    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      title: `${query.metric_name} (${query.aggregation_type})`,
      metricName: query.metric_name,
      aggregationType: query.aggregation_type,
      timeBucket: query.time_bucket,
      timeRangeMinutes,
      serviceName: query.service_name,
      chartType: 'line',
      color: '#3b82f6',
    }
    setWidgets([...widgets, newWidget])
  }

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id))
    setAlerts(alerts.filter((a) => a.widgetId !== id))
  }

  const handleClearDashboard = () => {
    setWidgets([])
    setAlerts([])
    localStorage.removeItem(DASHBOARD_STORAGE_KEY)
    setIsSaved(false)
  }

  const handleSaveDashboard = () => {
    try {
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(widgets))
      setIsSaved(true)
      // Show saved state for 2 seconds
      setTimeout(() => {
        // Check if widgets haven't changed
        const current = localStorage.getItem(DASHBOARD_STORAGE_KEY)
        if (current === JSON.stringify(widgets)) {
          setIsSaved(true)
        }
      }, 2000)
    } catch (error) {
      console.error('Failed to save dashboard to localStorage:', error)
    }
  }

  const handleDismissAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id))
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Metrics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your application metrics with customizable dashboards
          </p>
        </div>
        {widgets.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDashboard}
              disabled={isSaved}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isSaved
                  ? 'border-green-300 text-green-700 bg-green-50 cursor-default'
                  : 'border-blue-600 text-white bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Dashboard
                </>
              )}
            </button>
            <button
              onClick={handleClearDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Trash2 className="w-4 h-4" />
              Clear Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Query Builder */}
      {metricNames.length > 0 && (
        <div className="mb-6">
          <QueryBuilder
            metricNames={metricNames}
            services={services}
            onExecute={handleExecuteQuery}
            onClear={() => setWidgets([])}
          />
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <AlertsPanel alerts={alerts} onDismiss={handleDismissAlert} />
        </div>
      )}

      {/* Dashboard Grid */}
      <DashboardGrid widgets={widgets} onRemoveWidget={handleRemoveWidget} />

      {/* Empty State */}
      {widgets.length === 0 && metricNames.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <LayoutDashboard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No metrics available</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Start sending metrics to your application using OpenTelemetry to see them here.
          </p>
        </div>
      )}
    </div>
  )
}
