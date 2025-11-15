import axios, { AxiosInstance } from 'axios'
import type {
  Trace,
  TraceDetail,
  TraceFilters,
  Log,
  LogFilters,
  Metric,
  MetricFilters,
  MetricAggregation,
  AggregationRequest,
  Service,
} from '../types/api'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  // Health check
  async health(): Promise<{ status: string; timestamp: number }> {
    const response = await this.client.get('/health')
    return response.data
  }

  // Traces
  async getTraces(filters?: TraceFilters): Promise<{ traces: Trace[]; count: number }> {
    const response = await this.client.get<{ traces: Trace[]; count: number }>('/traces', {
      params: filters,
    })
    return response.data
  }

  async getTraceById(id: string): Promise<TraceDetail> {
    const response = await this.client.get<TraceDetail>(`/traces/${id}`)
    return response.data
  }

  // Logs
  async getLogs(filters?: LogFilters): Promise<{ logs: Log[]; count: number; total: number }> {
    const response = await this.client.get<{ logs: Log[]; count: number; total: number }>('/logs', {
      params: filters,
    })
    return response.data
  }

  async getLogsByTraceId(traceId: string): Promise<{ logs: Log[]; count: number }> {
    const response = await this.client.get<{ logs: Log[]; count: number }>(`/logs/trace/${traceId}`)
    return response.data
  }

  // Metrics
  async getMetrics(filters?: MetricFilters): Promise<{ metrics: Metric[]; count: number; total?: number }> {
    const response = await this.client.get<{ metrics: Metric[]; count: number; total?: number }>('/metrics', {
      params: filters,
    })
    return response.data
  }

  async getMetricNames(service?: string): Promise<{ names: string[]; count: number }> {
    const response = await this.client.get<{ names: string[]; count: number }>('/metrics/names', {
      params: service ? { service } : {},
    })
    return response.data
  }

  async aggregateMetrics(
    request: AggregationRequest
  ): Promise<{ results: MetricAggregation[]; count: number }> {
    const response = await this.client.post<{ results: MetricAggregation[]; count: number }>(
      '/metrics/aggregate',
      request
    )
    return response.data
  }

  // Services
  async getServices(): Promise<Service[]> {
    const response = await this.client.get<{ services: Service[]; count: number }>('/services')
    return response.data.services
  }

  // Trace comparison
  async compareTraces(traceIds: string[]): Promise<{ traces: TraceDetail[] }> {
    const response = await this.client.post<{ traces: TraceDetail[] }>('/traces/compare', {
      trace_ids: traceIds,
    })
    return response.data
  }
}

export const apiClient = new ApiClient()
