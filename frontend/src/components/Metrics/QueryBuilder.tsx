import { useState, useEffect } from 'react'
import { Play, Trash2 } from 'lucide-react'
import type { AggregationRequest } from '../../types/api'

interface QueryBuilderProps {
  metricNames: string[]
  services: string[]
  onExecute: (query: AggregationRequest) => void
  onClear?: () => void
}

const TIME_RANGES = [
  { label: 'Last 15 minutes', value: 15 },
  { label: 'Last 30 minutes', value: 30 },
  { label: 'Last 1 hour', value: 60 },
  { label: 'Last 3 hours', value: 180 },
  { label: 'Last 6 hours', value: 360 },
  { label: 'Last 12 hours', value: 720 },
  { label: 'Last 24 hours', value: 1440 },
]

const TIME_BUCKETS = [
  { label: '1 minute', value: '1 minute' },
  { label: '5 minutes', value: '5 minutes' },
  { label: '15 minutes', value: '15 minutes' },
  { label: '30 minutes', value: '30 minutes' },
  { label: '1 hour', value: '1 hour' },
  { label: '6 hours', value: '6 hours' },
]

const AGGREGATIONS: Array<AggregationRequest['aggregation_type']> = [
  'avg',
  'sum',
  'min',
  'max',
  'count',
]

export function QueryBuilder({
  metricNames,
  services,
  onExecute,
  onClear,
}: QueryBuilderProps) {
  const [metricName, setMetricName] = useState('')
  const [aggregationType, setAggregationType] =
    useState<AggregationRequest['aggregation_type']>('avg')
  const [timeBucket, setTimeBucket] = useState('5 minutes')
  const [timeRange, setTimeRange] = useState(60) // minutes
  const [serviceName, setServiceName] = useState<string>('')

  useEffect(() => {
    if (metricNames.length > 0 && !metricName) {
      setMetricName(metricNames[0])
    }
  }, [metricNames, metricName])

  const handleExecute = () => {
    if (!metricName) return

    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - timeRange * 60 * 1000)

    const query: AggregationRequest = {
      metric_name: metricName,
      aggregation_type: aggregationType,
      time_bucket: timeBucket,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    }

    if (serviceName) {
      query.service_name = serviceName
    }

    onExecute(query)
  }

  const handleClear = () => {
    setMetricName(metricNames[0] || '')
    setAggregationType('avg')
    setTimeBucket('5 minutes')
    setTimeRange(60)
    setServiceName('')
    onClear?.()
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Query Builder</h2>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={handleExecute}
            disabled={!metricName}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Execute
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Metric Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metric
          </label>
          <select
            value={metricName}
            onChange={(e) => setMetricName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {metricNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Aggregation Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aggregation
          </label>
          <select
            value={aggregationType}
            onChange={(e) =>
              setAggregationType(e.target.value as AggregationRequest['aggregation_type'])
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {AGGREGATIONS.map((agg) => (
              <option key={agg} value={agg}>
                {agg.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Time Bucket */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bucket Size
          </label>
          <select
            value={timeBucket}
            onChange={(e) => setTimeBucket(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {TIME_BUCKETS.map((bucket) => (
              <option key={bucket.value} value={bucket.value}>
                {bucket.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {TIME_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Service Name (Optional) */}
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service (Optional)
          </label>
          <select
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Services</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}


