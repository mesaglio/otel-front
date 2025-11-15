import { useState } from 'react'
import { Search, Filter, X, Calendar } from 'lucide-react'
import type { LogFilters } from '../../types/api'

interface LogFiltersBarProps {
  filters: LogFilters
  onFiltersChange: (filters: LogFilters) => void
  services: string[]
}

const SEVERITY_LEVELS = [
  { value: 1, label: 'TRACE', number: 1 },
  { value: 5, label: 'DEBUG', number: 5 },
  { value: 9, label: 'INFO', number: 9 },
  { value: 13, label: 'WARN', number: 13 },
  { value: 17, label: 'ERROR', number: 17 },
  { value: 21, label: 'FATAL', number: 21 },
]

const TIME_RANGES = [
  { label: 'Last 15 minutes', minutes: 15 },
  { label: 'Last 30 minutes', minutes: 30 },
  { label: 'Last 1 hour', minutes: 60 },
  { label: 'Last 3 hours', minutes: 180 },
  { label: 'Last 6 hours', minutes: 360 },
  { label: 'Last 12 hours', minutes: 720 },
  { label: 'Last 24 hours', minutes: 1440 },
]

export function LogFiltersBar({
  filters,
  onFiltersChange,
  services,
}: LogFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchQuery, setSearchQuery] = useState(filters.search || '')

  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value || undefined })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    handleFilterChange('search', value)
  }

  const handleTimeRangeChange = (minutes: number) => {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - minutes * 60 * 1000)
    
    onFiltersChange({
      ...filters,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    })
  }

  const clearFilters = () => {
    onFiltersChange({ limit: 100 })
    setSearchQuery('')
  }

  const hasActiveFilters =
    filters.service ||
    filters.trace_id ||
    filters.severity ||
    filters.start_time ||
    filters.end_time ||
    searchQuery

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      {/* Main search and quick filters */}
      <div className="flex gap-3 items-center">
        {/* Search input */}
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search in log messages..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Service filter */}
        <select
          value={filters.service || ''}
          onChange={(e) => handleFilterChange('service', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Services</option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>

        {/* Severity filter */}
        <select
          value={filters.severity || ''}
          onChange={(e) => handleFilterChange('severity', e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Severities</option>
          {SEVERITY_LEVELS.map((level) => (
            <option key={level.value} value={level.number}>
              {level.label}
            </option>
          ))}
        </select>

        {/* Advanced filters toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 border border-gray-300 rounded-md shadow-sm flex items-center gap-2 transition-colors ${
            showAdvanced ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
          }`}
        >
          <Filter size={18} />
          <span className="text-sm">Advanced</span>
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
            title="Clear all filters"
          >
            <X size={18} />
            <span className="text-sm">Clear</span>
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          {/* Time range quick selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Quick Time Range
            </label>
            <div className="flex flex-wrap gap-2">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.minutes}
                  onClick={() => handleTimeRangeChange(range.minutes)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trace ID filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Trace ID
            </label>
            <input
              type="text"
              placeholder="Enter trace ID for correlation..."
              value={filters.trace_id || ''}
              onChange={(e) => handleFilterChange('trace_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

          {/* Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Results Limit
            </label>
            <select
              value={filters.limit || 100}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="border-t border-gray-200 pt-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {filters.service && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Service: {filters.service}
                <button
                  onClick={() => handleFilterChange('service', null)}
                  className="ml-1 hover:text-blue-900"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {filters.severity && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {SEVERITY_LEVELS.find(l => l.number === filters.severity)?.label}
                <button
                  onClick={() => handleFilterChange('severity', null)}
                  className="ml-1 hover:text-purple-900"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {filters.trace_id && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Trace: {filters.trace_id.substring(0, 8)}...
                <button
                  onClick={() => handleFilterChange('trace_id', null)}
                  className="ml-1 hover:text-green-900"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {(filters.start_time || filters.end_time) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Time range
                <button
                  onClick={() => {
                    handleFilterChange('start_time', null)
                    handleFilterChange('end_time', null)
                  }}
                  className="ml-1 hover:text-orange-900"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                Search: {searchQuery}
                <button
                  onClick={() => handleSearchChange('')}
                  className="ml-1 hover:text-pink-900"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

