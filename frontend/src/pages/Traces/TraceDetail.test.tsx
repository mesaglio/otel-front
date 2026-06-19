import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TraceDetail } from './TraceDetail'
import type { Log, TraceDetail as TraceDetailType } from '../../types/api'

const mockTrace: TraceDetailType = {
  id: 'trace-1',
  trace_id: 'trace-1',
  service_name: 'checkout-service',
  operation_name: 'GET /checkout',
  start_time: '2026-05-29T12:00:00.000Z',
  end_time: '2026-05-29T12:00:00.120Z',
  duration_ms: 120,
  span_count: 1,
  status_code: 1,
  spans: [
    {
      id: 1,
      trace_id: 'trace-1',
      span_id: 'span-1',
      operation_name: 'GET /checkout',
      service_name: 'checkout-service',
      start_time: '2026-05-29T12:00:00.000Z',
      end_time: '2026-05-29T12:00:00.120Z',
      duration_ms: 120,
      status_code: 'OK',
      attributes: {
        'http.method': 'GET',
      },
    },
  ],
}

const mockLogs: Log[] = [
  {
    id: 55,
    trace_id: 'trace-1',
    span_id: 'span-1',
    timestamp: '2026-05-29T12:00:00.050Z',
    severity: 17,
    severity_text: 'ERROR',
    service_name: 'checkout-service',
    body: '{"message":"Payment failed","error":{"code":"CARD_DECLINED"}}',
    attributes: {
      requestId: 'req-123',
    },
    resource_attributes: {
      'service.version': '1.2.3',
    },
  },
]

vi.mock('../../hooks/useTraces', () => ({
  useTrace: () => ({
    trace: mockTrace,
    loading: false,
    error: null,
  }),
}))

vi.mock('../../hooks/useLogs', () => ({
  useLogsByTraceId: () => ({
    logs: mockLogs,
    loading: false,
    error: null,
  }),
}))

vi.mock('../../components/Traces/WaterfallView', () => ({
  WaterfallView: ({ onSpanClick }: { onSpanClick?: (span: (typeof mockTrace.spans)[number]) => void }) => (
    <button onClick={() => onSpanClick?.(mockTrace.spans[0])}>Open Span</button>
  ),
}))

vi.mock('../../components/Traces/FlameGraph', () => ({
  FlameGraph: () => <div>Flame Graph Stub</div>,
}))

describe('TraceDetail', () => {
  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/traces/trace-1']}>
        <Routes>
          <Route path="/traces/:id" element={<TraceDetail />} />
        </Routes>
      </MemoryRouter>
    )

  it('keeps span and log panels mutually exclusive', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Open Span' }))
    expect(screen.getByRole('heading', { name: 'GET /checkout' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Payment failed' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /view details for related log 55/i }))
    expect(screen.getByRole('heading', { name: 'Payment failed' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'GET /checkout' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Span' }))
    expect(screen.getByRole('heading', { name: 'GET /checkout' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Payment failed' })).not.toBeInTheDocument()
  })
})
