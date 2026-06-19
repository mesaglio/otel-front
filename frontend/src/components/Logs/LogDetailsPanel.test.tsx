import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LogDetailsPanel } from './LogDetailsPanel'
import type { Log } from '../../types/api'

const baseLog: Log = {
  id: 42,
  trace_id: 'trace-abcdef1234567890',
  span_id: 'span-42',
  timestamp: '2026-05-29T12:34:56.123456Z',
  severity: 13,
  severity_text: 'WARN',
  service_name: 'billing-service',
  body: '{"message":"Payment failed","request":{"id":"req-1","status":500}}',
  attributes: {
    user_id: 'u-123',
    request: {
      headers: {
        accept: 'application/json',
      },
      referer: null,
    },
  },
  resource_attributes: {
    'service.version': '1.2.3',
    process: {
      command_args: ['node', 'server.js'],
    },
  },
}

describe('LogDetailsPanel', () => {
  it('renders log metadata and identifiers', () => {
    render(
      <MemoryRouter>
        <LogDetailsPanel log={baseLog} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Payment failed' })).toBeInTheDocument()
    expect(screen.getByText('billing-service')).toBeInTheDocument()
    expect(screen.getByText('WARN')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('trace-abcdef1234567890')).toBeInTheDocument()
    expect(screen.getByText('span-42')).toBeInTheDocument()
  })

  it('flattens nested json in the body section', () => {
    render(
      <MemoryRouter>
        <LogDetailsPanel log={baseLog} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('request.id')).toBeInTheDocument()
    expect(screen.getByText('req-1')).toBeInTheDocument()
    expect(screen.getByText('request.status')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('falls back to the raw body when the log body is not valid json', () => {
    render(
      <MemoryRouter>
        <LogDetailsPanel
          log={{
            ...baseLog,
            body: 'plain text body',
            attributes: {},
            resource_attributes: {},
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'plain text body' })).toBeInTheDocument()
    expect(screen.getByText('message')).toBeInTheDocument()
    expect(screen.getAllByText('plain text body')).toHaveLength(2)
    expect(screen.queryByText('Attributes')).not.toBeInTheDocument()
    expect(screen.queryByText('Resource Attributes')).not.toBeInTheDocument()
  })

  it('renders attributes and resource attributes sections when present', () => {
    render(
      <MemoryRouter>
        <LogDetailsPanel log={baseLog} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('Attributes')).toBeInTheDocument()
    expect(screen.getByText('user_id')).toBeInTheDocument()
    expect(screen.getByText('u-123')).toBeInTheDocument()
    expect(screen.getByText('request.headers.accept')).toBeInTheDocument()
    expect(screen.getByText('application/json')).toBeInTheDocument()
    expect(screen.getByText('request.referer')).toBeInTheDocument()
    expect(screen.getByText('null')).toBeInTheDocument()
    expect(screen.getByText('Resource Attributes')).toBeInTheDocument()
    expect(screen.getByText('service.version')).toBeInTheDocument()
    expect(screen.getByText('1.2.3')).toBeInTheDocument()
    expect(screen.getByText('process.command_args')).toBeInTheDocument()
    expect(screen.getByText('["node","server.js"]')).toBeInTheDocument()
  })
})
