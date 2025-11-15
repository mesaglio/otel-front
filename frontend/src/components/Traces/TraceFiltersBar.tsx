import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import type { TraceFilters } from '../../types/api'

interface TraceFiltersBarProps {
  filters: TraceFilters
  onFiltersChange: (filters: TraceFilters) => void
  services: string[]
}

export function TraceFiltersBar({
  filters,
  onFiltersChange,
  services,
}: TraceFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchQuery, setSearchQuery] = useState(filters.search || '')

  const handleFilterChange = (key: keyof TraceFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value || undefined })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    handleFilterChange('search', value)
  }

  const clearFilters = () => {
    onFiltersChange({ limit: 100 })
    setSearchQuery('')
  }

  const hasActiveFilters =
    filters.service ||
    filters.errors ||
    filters.min_duration ||
    filters.max_duration ||
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
            placeholder="Search by operation name or trace ID..."
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

        {/* Errors only checkbox */}
        <label className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={filters.errors || false}
            onChange={(e) => handleFilterChange('errors', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Errors only</span>
        </label>

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
        <div className="border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Min duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Duration (ms)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.min_duration || ''}
              onChange={(e) =>
                handleFilterChange('min_duration', e.target.value ? parseFloat(e.target.value) : null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 100"
            />
          </div>

          {/* Max duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Duration (ms)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.max_duration || ''}
              onChange={(e) =>
                handleFilterChange('max_duration', e.target.value ? parseFloat(e.target.value) : null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 5000"
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
            {filters.errors && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Errors only
                <button
                  onClick={() => handleFilterChange('errors', false)}
                  className="ml-1 hover:text-red-900"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {filters.min_duration && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Min: {filters.min_duration}ms
                <button
                  onClick={() => handleFilterChange('min_duration', null)}
                  className="ml-1 hover:text-green-900"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {filters.max_duration && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Max: {filters.max_duration}ms
                <button
                  onClick={() => handleFilterChange('max_duration', null)}
                  className="ml-1 hover:text-green-900"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Search: {searchQuery}
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-1 hover:text-purple-900"
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


