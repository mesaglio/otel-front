import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogTable } from './LogTable'
import type { Log } from '../../types/api'

const mockLog: Log = {
  id: 101,
  trace_id: 'trace-1234567890abcdef',
  span_id: 'span-123',
  timestamp: '2026-05-29T12:34:56.123456Z',
  severity: 17,
  severity_text: 'ERROR',
  service_name: 'checkout-service',
  body: 'Payment failed for order 123',
  attributes: { env: 'prod' },
  resource_attributes: { host: 'api-01' },
}

describe('LogTable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('calls onSelectLog when a row is clicked', () => {
    const onSelectLog = vi.fn()

    render(
      <MemoryRouter>
        <LogTable logs={[mockLog]} onSelectLog={onSelectLog} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /view details for log 101/i }))

    expect(onSelectLog).toHaveBeenCalledWith(mockLog)
  })

  it('does not select the row when the trace link is clicked', () => {
    const onSelectLog = vi.fn()

    render(
      <MemoryRouter>
        <LogTable logs={[mockLog]} onSelectLog={onSelectLog} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('link', { name: /view trace/i }))

    expect(onSelectLog).not.toHaveBeenCalled()
  })

  it('copies a log without selecting the row', async () => {
    const onSelectLog = vi.fn()

    render(
      <MemoryRouter>
        <LogTable logs={[mockLog]} onSelectLog={onSelectLog} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTitle(/copy log entry/i))

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '[2026-05-29T12:34:56.123Z] [ERROR] [checkout-service] Payment failed for order 123'
      )
    )
    expect(onSelectLog).not.toHaveBeenCalled()
  })

  it('highlights the selected row', () => {
    render(
      <MemoryRouter>
        <LogTable logs={[mockLog]} selectedLogId={101} />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /view details for log 101/i })).toHaveClass(
      'bg-blue-50'
    )
  })
})
