import { useState, useEffect, useMemo } from 'react'
import { X, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { MetricChart } from './MetricChart'
import { useMetricAggregation } from '../../hooks/useMetrics'
import type { AggregationRequest } from '../../types/api'

// Widget configuration with relative time parameters (for persistence)
export interface WidgetConfig {
  id: string
  title: string
  metricName: string
  aggregationType: 'avg' | 'sum' | 'min' | 'max' | 'count'
  timeBucket: string
  timeRangeMinutes: number // Relative time range in minutes
  serviceName?: string
  chartType?: 'line' | 'area' | 'bar'
  color?: string
  threshold?: {
    warning?: number
    critical?: number
  }
}

interface MetricWidgetProps {
  config: WidgetConfig
  onRemove?: (id: string) => void
}

export function MetricWidget({ config, onRemove }: MetricWidgetProps) {
  // Calculate query with current timestamps (recalculated on each render)
  const query: AggregationRequest = useMemo(() => {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - config.timeRangeMinutes * 60 * 1000)
    
    return {
      metric_name: config.metricName,
      aggregation_type: config.aggregationType,
      time_bucket: config.timeBucket,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      ...(config.serviceName && { service_name: config.serviceName }),
    }
  }, [config.metricName, config.aggregationType, config.timeBucket, config.timeRangeMinutes, config.serviceName])

  const { results, loading, error } = useMetricAggregation(query)
  const [alert, setAlert] = useState<'warning' | 'critical' | null>(null)

  // Check thresholds
  useEffect(() => {
    if (!config.threshold || results.length === 0) {
      setAlert(null)
      return
    }

    const latestValue = results[results.length - 1]?.value
    if (latestValue === undefined) return

    if (config.threshold.critical && latestValue >= config.threshold.critical) {
      setAlert('critical')
    } else if (config.threshold.warning && latestValue >= config.threshold.warning) {
      setAlert('warning')
    } else {
      setAlert(null)
    }
  }, [results, config.threshold])

  const latestValue = results.length > 0 ? results[results.length - 1].value : null
  const previousValue = results.length > 1 ? results[results.length - 2].value : null
  const trend =
    latestValue !== null && previousValue !== null
      ? ((latestValue - previousValue) / previousValue) * 100
      : null

  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 ${
        alert === 'critical'
          ? 'border-red-500'
          : alert === 'warning'
          ? 'border-yellow-500'
          : 'border-transparent'
      }`}
    >
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">{config.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {config.metricName} ({config.aggregationType})
            </p>
          </div>
          <div className="flex items-center gap-2">
            {alert && (
              <AlertTriangle
                className={`w-5 h-5 ${
                  alert === 'critical' ? 'text-red-500' : 'text-yellow-500'
                }`}
              />
            )}
            {onRemove && (
              <button
                onClick={() => onRemove(config.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Latest Value */}
        {latestValue !== null && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Current Value</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {latestValue.toFixed(2)}
              </span>
              {results[results.length - 1]?.unit && (
                <span className="text-sm text-gray-500">
                  {results[results.length - 1].unit}
                </span>
              )}
              {trend !== null && trend !== 0 && (
                <div
                  className={`flex items-center gap-1 text-sm ${
                    trend > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {trend > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64 text-red-600">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{error.message}</p>
            </div>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p className="text-sm">No data available</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <MetricChart
            data={results}
            chartType={config.chartType}
            color={config.color}
            showLegend={false}
            height={250}
          />
        )}

        {/* Threshold indicators */}
        {config.threshold && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs">
              {config.threshold.warning && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span>Warning: {config.threshold.warning}</span>
                </div>
              )}
              {config.threshold.critical && (
                <div className="flex items-center gap-1 text-red-600">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span>Critical: {config.threshold.critical}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

