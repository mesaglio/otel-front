import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LogFiltersBar } from './LogFiltersBar'

describe('LogFiltersBar', () => {
  const mockServices = ['service-a', 'service-b', 'service-c']
  const mockOnFiltersChange = vi.fn()

  it('renders search input', () => {
    render(
      <LogFiltersBar
        filters={{ limit: 100 }}
        onFiltersChange={mockOnFiltersChange}
        services={mockServices}
      />
    )

    const searchInput = screen.getByPlaceholderText(/search in log messages/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('shows all services in dropdown', () => {
    render(
      <LogFiltersBar
        filters={{ limit: 100 }}
        onFiltersChange={mockOnFiltersChange}
        services={mockServices}
      />
    )

    // Check that "All Services" option exists
    expect(screen.getByText('All Services')).toBeInTheDocument()
    expect(screen.getByText('service-a')).toBeInTheDocument()
    expect(screen.getByText('service-b')).toBeInTheDocument()
  })

  it('calls onFiltersChange when search changes', () => {
    render(
      <LogFiltersBar
        filters={{ limit: 100 }}
        onFiltersChange={mockOnFiltersChange}
        services={mockServices}
      />
    )

    const searchInput = screen.getByPlaceholderText(/search in log messages/i)
    fireEvent.change(searchInput, { target: { value: 'error' } })

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'error',
      })
    )
  })

  it('shows advanced filters when Advanced button clicked', () => {
    render(
      <LogFiltersBar
        filters={{ limit: 100 }}
        onFiltersChange={mockOnFiltersChange}
        services={mockServices}
      />
    )

    const advancedButton = screen.getByRole('button', { name: /advanced/i })
    fireEvent.click(advancedButton)

    expect(screen.getByText(/quick time range/i)).toBeInTheDocument()
  })

  it('clears all filters when Clear button clicked', () => {
    render(
      <LogFiltersBar
        filters={{ limit: 100, search: 'test', service: 'service-a' }}
        onFiltersChange={mockOnFiltersChange}
        services={mockServices}
      />
    )

    const clearButton = screen.getByRole('button', { name: /clear/i })
    fireEvent.click(clearButton)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ limit: 100 })
  })

  it('displays active filter chips', () => {
    render(
      <LogFiltersBar
        filters={{ limit: 100, search: 'error', service: 'service-a', severity: 17 }}
        onFiltersChange={mockOnFiltersChange}
        services={mockServices}
      />
    )

    expect(screen.getByText('Service: service-a')).toBeInTheDocument()
    expect(screen.getByText('Search: error')).toBeInTheDocument()
    // Verify active filters section exists
    expect(screen.getByText('Active filters:')).toBeInTheDocument()
  })
})

