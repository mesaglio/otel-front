// API Types
export interface Trace {
  id: string
  trace_id: string
  service_name: string
  operation_name: string
  start_time: string
  end_time: string
  duration_ms: number
  span_count: number
  has_errors: boolean
}

export interface Span {
  id: number
  trace_id: string
  span_id: string
  parent_span_id?: string
  operation_name: string
  service_name: string
  start_time: string
  end_time: string
  duration_ms: number
  status_code: string
  status_message?: string
  attributes: Record<string, string>
  events?: SpanEvent[]
  links?: SpanLink[]
}

export interface SpanEvent {
  name: string
  timestamp: string
  attributes: Record<string, string>
}

export interface SpanLink {
  trace_id: string
  span_id: string
  attributes: Record<string, string>
}

export interface TraceDetail extends Trace {
  spans: Span[]
}

export interface Log {
  id: number
  trace_id?: string
  span_id?: string
  timestamp: string
  severity: number
  severity_text: string
  service_name: string
  body: string
  attributes: Record<string, string>
  resource_attributes: Record<string, string>
}

export interface Metric {
  id: number
  metric_name: string
  metric_type: string
  service_name: string
  timestamp: string
  value: number
  unit?: string
  attributes: Record<string, string>
}

export interface MetricAggregation {
  time_bucket: string
  metric_name: string
  aggregation_type: string
  value: number
  unit?: string
}

export interface Service {
  service_name: string
}

export interface TraceFilters {
  service?: string
  errors?: boolean
  min_duration?: number
  max_duration?: number
  search?: string
  limit?: number
  offset?: number
}

export interface LogFilters {
  service?: string
  trace_id?: string
  search?: string
  severity?: number
  start_time?: string
  end_time?: string
  limit?: number
  offset?: number
}

export interface MetricFilters {
  name?: string
  type?: string
  service?: string
  start_time?: string
  end_time?: string
  limit?: number
  offset?: number
}

export interface AggregationRequest {
  metric_name: string
  aggregation_type: 'avg' | 'sum' | 'min' | 'max' | 'count'
  time_bucket: string
  start_time: string
  end_time: string
  service_name?: string
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'new_trace' | 'new_log' | 'new_metric' | 'ping' | 'pong'
  data: Record<string, unknown>
}

export interface ApiResponse<T> {
  [key: string]: T | number
  count: number
}
