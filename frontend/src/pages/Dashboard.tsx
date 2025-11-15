import { useState, useEffect } from 'react'
import { apiClient } from '../services/api'
import type { Trace, Log, Metric } from '../types/api'
import { formatDuration } from '../utils/format'
import { OTelExportConfig } from '../components/OTelExportConfig'

export function Dashboard() {
  const [recentTraces, setRecentTraces] = useState<Trace[]>([])
  const [recentLogs, setRecentLogs] = useState<Log[]>([])
  const [recentMetrics, setRecentMetrics] = useState<Metric[]>([])
  const [stats, setStats] = useState({
    totalTraces: 0,
    totalLogs: 0,
    totalMetrics: 0,
    services: 0,
  })

  useEffect(() => {
    // Load initial data
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [traces, logs, metrics, services] = await Promise.all([
        apiClient.getTraces({ limit: 5 }),
        apiClient.getLogs({ limit: 5 }),
        apiClient.getMetrics({ limit: 5 }),
        apiClient.getServices(),
      ])

      setRecentTraces(traces.traces)
      setRecentLogs(logs.logs)
      setRecentMetrics(metrics.metrics)
      setStats({
        totalTraces: traces.count,
        totalLogs: logs.total,
        totalMetrics: metrics.total || metrics.count, // Use total if available, fallback to count
        services: services.length,
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* OpenTelemetry Configuration */}
      <div className="mb-8">
        <OTelExportConfig 
          httpPort={4318} 
          grpcPort={4317}
          hasData={stats.totalTraces > 0 || stats.totalLogs > 0 || stats.totalMetrics > 0}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Traces</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalTraces}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Logs</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalLogs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Metrics</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalMetrics}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Services</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.services}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Traces */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Traces</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentTraces.map((trace) => (
                  <li key={trace.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {trace.operation_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{trace.service_name}</p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {formatDuration(trace.duration_ms)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Logs</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentLogs.map((log) => (
                  <li key={log.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {log.severity_text}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{log.body}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Metrics */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Metrics</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentMetrics.map((metric) => (
                  <li key={metric.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {metric.metric_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{metric.service_name}</p>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {metric.value} {metric.unit || ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
