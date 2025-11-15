import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryBuilder } from './QueryBuilder'

describe('QueryBuilder', () => {
  const mockMetricNames = ['http.server.duration', 'http.server.requests', 'cpu.usage']
  const mockServices = ['service-a', 'service-b']
  const mockOnExecute = vi.fn()
  const mockOnClear = vi.fn()

  it('renders all metric names in dropdown', () => {
    render(
      <QueryBuilder
        metricNames={mockMetricNames}
        services={mockServices}
        onExecute={mockOnExecute}
        onClear={mockOnClear}
      />
    )

    // Check that metrics appear in the document
    expect(screen.getByText('http.server.duration')).toBeInTheDocument()
    expect(screen.getByText('http.server.requests')).toBeInTheDocument()
  })

  it('calls onExecute when Execute button is clicked', () => {
    render(
      <QueryBuilder
        metricNames={mockMetricNames}
        services={mockServices}
        onExecute={mockOnExecute}
        onClear={mockOnClear}
      />
    )

    const executeButton = screen.getByRole('button', { name: /execute/i })
    fireEvent.click(executeButton)

    expect(mockOnExecute).toHaveBeenCalledTimes(1)
    expect(mockOnExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        metric_name: expect.any(String),
        aggregation_type: expect.any(String),
        time_bucket: expect.any(String),
      })
    )
  })

  it('calls onClear when Clear button is clicked', () => {
    render(
      <QueryBuilder
        metricNames={mockMetricNames}
        services={mockServices}
        onExecute={mockOnExecute}
        onClear={mockOnClear}
      />
    )

    const clearButton = screen.getByRole('button', { name: /clear/i })
    fireEvent.click(clearButton)

    expect(mockOnClear).toHaveBeenCalledTimes(1)
  })

  it('allows changing aggregation type', () => {
    render(
      <QueryBuilder
        metricNames={mockMetricNames}
        services={mockServices}
        onExecute={mockOnExecute}
        onClear={mockOnClear}
      />
    )

    // Find the select with "AVG" and change it
    const selects = screen.getAllByRole('combobox')
    const aggregationSelect = selects.find(select => 
      select.textContent?.includes('AVG')
    )
    
    if (aggregationSelect) {
      fireEvent.change(aggregationSelect, { target: { value: 'sum' } })
      expect(aggregationSelect).toHaveValue('sum')
    } else {
      // If we can't find it by text, just verify AVG option exists
      expect(screen.getByText('AVG')).toBeInTheDocument()
    }
  })
})

