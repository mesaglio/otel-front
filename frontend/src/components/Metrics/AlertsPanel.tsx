import { AlertTriangle, XCircle, Clock } from 'lucide-react'

export interface Alert {
  id: string
  widgetId: string
  widgetTitle: string
  severity: 'warning' | 'critical'
  value: number
  threshold: number
  unit?: string
  timestamp: Date
}

interface AlertsPanelProps {
  alerts: Alert[]
  onDismiss?: (id: string) => void
}

export function AlertsPanel({ alerts, onDismiss }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h2>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-gray-500">No active alerts</p>
          <p className="text-sm text-gray-400 mt-1">All metrics are within thresholds</p>
        </div>
      </div>
    )
  }

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical')
  const warningAlerts = alerts.filter((a) => a.severity === 'warning')

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
        <div className="flex items-center gap-3">
          {criticalAlerts.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <XCircle className="w-3 h-3" />
              {criticalAlerts.length} Critical
            </span>
          )}
          {warningAlerts.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <AlertTriangle className="w-3 h-3" />
              {warningAlerts.length} Warning
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts
          .sort((a, b) => {
            // Critical first, then by timestamp
            if (a.severity !== b.severity) {
              return a.severity === 'critical' ? -1 : 1
            }
            return b.timestamp.getTime() - a.timestamp.getTime()
          })
          .map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.severity === 'critical'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {alert.severity === 'critical' ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        alert.severity === 'critical' ? 'text-red-900' : 'text-yellow-900'
                      }`}
                    >
                      {alert.widgetTitle}
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      alert.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                    }`}
                  >
                    Current value:{' '}
                    <span className="font-semibold">
                      {alert.value.toFixed(2)} {alert.unit}
                    </span>{' '}
                    exceeds threshold of{' '}
                    <span className="font-semibold">
                      {alert.threshold} {alert.unit}
                    </span>
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{alert.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}


