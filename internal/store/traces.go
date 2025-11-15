package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"go.uber.org/zap"
)

// TracesStore handles trace and span storage and retrieval
type TracesStore struct {
	db     *sql.DB
	logger *zap.Logger
}

// NewTracesStore creates a new traces store
func NewTracesStore(db *sql.DB, logger *zap.Logger) *TracesStore {
	return &TracesStore{
		db:     db,
		logger: logger,
	}
}

// Trace represents a complete distributed trace
type Trace struct {
	TraceID       string                 `json:"trace_id"`
	ServiceName   string                 `json:"service_name"`
	OperationName string                 `json:"operation_name"`
	StartTime     time.Time              `json:"start_time"`
	EndTime       time.Time              `json:"end_time"`
	DurationMs    int64                  `json:"duration_ms"`
	SpanCount     int                    `json:"span_count"`
	ErrorCount    int                    `json:"error_count"`
	StatusCode    int                    `json:"status_code"`
	Attributes    map[string]interface{} `json:"attributes,omitempty"`
	Spans         []Span                 `json:"spans,omitempty"`
}

// Span represents a single span within a trace
type Span struct {
	SpanID        string                 `json:"span_id"`
	TraceID       string                 `json:"trace_id"`
	ParentSpanID  *string                `json:"parent_span_id,omitempty"`
	ServiceName   string                 `json:"service_name"`
	OperationName string                 `json:"operation_name"`
	SpanKind      string                 `json:"span_kind"`
	StartTime     time.Time              `json:"start_time"`
	EndTime       time.Time              `json:"end_time"`
	DurationMs    int64                  `json:"duration_ms"`
	StatusCode    int                    `json:"status_code"`
	StatusMessage *string                `json:"status_message,omitempty"`
	Attributes    map[string]interface{} `json:"attributes,omitempty"`
	Events        []SpanEvent            `json:"events,omitempty"`
	Links         []SpanLink             `json:"links,omitempty"`
}

// SpanEvent represents an event within a span
type SpanEvent struct {
	Name       string                 `json:"name"`
	Timestamp  time.Time              `json:"timestamp"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

// SpanLink represents a link to another span
type SpanLink struct {
	TraceID    string                 `json:"trace_id"`
	SpanID     string                 `json:"span_id"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

// InsertTrace inserts a new trace with its spans
func (ts *TracesStore) InsertTrace(ctx context.Context, trace *Trace) error {
	tx, err := ts.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert trace
	attributesJSON, _ := json.Marshal(trace.Attributes)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO traces (trace_id, service_name, operation_name, start_time, end_time,
			duration_ms, span_count, error_count, status_code, attributes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (trace_id) DO UPDATE SET
			end_time = EXCLUDED.end_time,
			duration_ms = EXCLUDED.duration_ms,
			span_count = EXCLUDED.span_count,
			error_count = EXCLUDED.error_count
	`, trace.TraceID, trace.ServiceName, trace.OperationName, trace.StartTime, trace.EndTime,
		trace.DurationMs, trace.SpanCount, trace.ErrorCount, trace.StatusCode, string(attributesJSON))

	if err != nil {
		return fmt.Errorf("failed to insert trace: %w", err)
	}

	// Insert spans
	for _, span := range trace.Spans {
		if err := ts.insertSpan(ctx, tx, &span); err != nil {
			return fmt.Errorf("failed to insert span: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (ts *TracesStore) insertSpan(ctx context.Context, tx *sql.Tx, span *Span) error {
	attributesJSON, _ := json.Marshal(span.Attributes)
	eventsJSON, _ := json.Marshal(span.Events)
	linksJSON, _ := json.Marshal(span.Links)

	_, err := tx.ExecContext(ctx, `
		INSERT INTO spans (span_id, trace_id, parent_span_id, service_name, operation_name,
			span_kind, start_time, end_time, duration_ms, status_code, status_message,
			attributes, events, links)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (span_id) DO NOTHING
	`, span.SpanID, span.TraceID, span.ParentSpanID, span.ServiceName, span.OperationName,
		span.SpanKind, span.StartTime, span.EndTime, span.DurationMs, span.StatusCode,
		span.StatusMessage, string(attributesJSON), string(eventsJSON), string(linksJSON))

	return err
}

// GetTraces retrieves traces with optional filters
func (ts *TracesStore) GetTraces(ctx context.Context, filters TraceFilters) ([]Trace, error) {
	query := `
		SELECT trace_id, service_name, operation_name, start_time, end_time,
			duration_ms, span_count, error_count, status_code, attributes
		FROM traces
		WHERE 1=1
	`
	args := []interface{}{}

	if filters.ServiceName != "" {
		query += " AND service_name = ?"
		args = append(args, filters.ServiceName)
	}

	if filters.MinDuration > 0 {
		query += " AND duration_ms >= ?"
		args = append(args, filters.MinDuration)
	}

	if filters.MaxDuration > 0 {
		query += " AND duration_ms <= ?"
		args = append(args, filters.MaxDuration)
	}

	if filters.HasErrors {
		query += " AND error_count > 0"
	}

	if filters.Search != "" {
		query += " AND (operation_name LIKE ? OR trace_id LIKE ?)"
		searchPattern := "%" + filters.Search + "%"
		args = append(args, searchPattern, searchPattern)
	}

	if !filters.StartTime.IsZero() {
		query += " AND start_time >= ?"
		args = append(args, filters.StartTime)
	}

	if !filters.EndTime.IsZero() {
		query += " AND start_time <= ?"
		args = append(args, filters.EndTime)
	}

	query += " ORDER BY start_time DESC LIMIT ? OFFSET ?"
	args = append(args, filters.Limit, filters.Offset)

	rows, err := ts.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query traces: %w", err)
	}
	defer rows.Close()

	traces := []Trace{}
	for rows.Next() {
		var trace Trace
		var attributesJSON any

		err := rows.Scan(&trace.TraceID, &trace.ServiceName, &trace.OperationName,
			&trace.StartTime, &trace.EndTime, &trace.DurationMs, &trace.SpanCount,
			&trace.ErrorCount, &trace.StatusCode, &attributesJSON)
		if err != nil {
			return nil, fmt.Errorf("failed to scan trace: %w", err)
		}

		// Handle JSON columns - DuckDB v2 returns map directly
		if attributesJSON != nil {
			if m, ok := attributesJSON.(map[string]any); ok {
				trace.Attributes = m
			} else if bytes, ok := attributesJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &trace.Attributes)
			}
		}

		traces = append(traces, trace)
	}

	return traces, nil
}

// GetTraceByID retrieves a single trace with all its spans
func (ts *TracesStore) GetTraceByID(ctx context.Context, traceID string) (*Trace, error) {
	// Get trace
	var trace Trace
	var attributesJSON any

	err := ts.db.QueryRowContext(ctx, `
		SELECT trace_id, service_name, operation_name, start_time, end_time,
			duration_ms, span_count, error_count, status_code, attributes
		FROM traces
		WHERE trace_id = ?
	`, traceID).Scan(&trace.TraceID, &trace.ServiceName, &trace.OperationName,
		&trace.StartTime, &trace.EndTime, &trace.DurationMs, &trace.SpanCount,
		&trace.ErrorCount, &trace.StatusCode, &attributesJSON)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("trace not found")
		}
		return nil, fmt.Errorf("failed to query trace: %w", err)
	}

	// Handle JSON columns - DuckDB v2 returns map directly
	if attributesJSON != nil {
		if m, ok := attributesJSON.(map[string]any); ok {
			trace.Attributes = m
		} else if bytes, ok := attributesJSON.([]byte); ok && len(bytes) > 0 {
			json.Unmarshal(bytes, &trace.Attributes)
		}
	}

	// Get spans
	spans, err := ts.getSpansByTraceID(ctx, traceID)
	if err != nil {
		return nil, err
	}
	trace.Spans = spans

	return &trace, nil
}

func (ts *TracesStore) getSpansByTraceID(ctx context.Context, traceID string) ([]Span, error) {
	rows, err := ts.db.QueryContext(ctx, `
		SELECT span_id, trace_id, parent_span_id, service_name, operation_name,
			span_kind, start_time, end_time, duration_ms, status_code, status_message,
			attributes, events, links
		FROM spans
		WHERE trace_id = ?
		ORDER BY start_time ASC
	`, traceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query spans: %w", err)
	}
	defer rows.Close()

	spans := []Span{}
	for rows.Next() {
		var span Span
		var attributesJSON, eventsJSON, linksJSON any

		err := rows.Scan(&span.SpanID, &span.TraceID, &span.ParentSpanID, &span.ServiceName,
			&span.OperationName, &span.SpanKind, &span.StartTime, &span.EndTime,
			&span.DurationMs, &span.StatusCode, &span.StatusMessage,
			&attributesJSON, &eventsJSON, &linksJSON)
		if err != nil {
			return nil, fmt.Errorf("failed to scan span: %w", err)
		}

		// Handle JSON columns - DuckDB v2 returns map/array directly
		if attributesJSON != nil {
			if m, ok := attributesJSON.(map[string]any); ok {
				span.Attributes = m
			} else if bytes, ok := attributesJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &span.Attributes)
			} else if str, ok := attributesJSON.(string); ok && len(str) > 0 {
				json.Unmarshal([]byte(str), &span.Attributes)
			}
		}
		// For complex types, convert to JSON and unmarshal
		if eventsJSON != nil {
			if bytes, ok := eventsJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &span.Events)
			} else if str, ok := eventsJSON.(string); ok && len(str) > 0 {
				json.Unmarshal([]byte(str), &span.Events)
			} else if eventsJSON != nil {
				// DuckDB v2 might return a Go type, marshal and unmarshal
				if jsonBytes, err := json.Marshal(eventsJSON); err == nil {
					json.Unmarshal(jsonBytes, &span.Events)
				}
			}
		}
		if linksJSON != nil {
			if bytes, ok := linksJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &span.Links)
			} else if str, ok := linksJSON.(string); ok && len(str) > 0 {
				json.Unmarshal([]byte(str), &span.Links)
			} else if linksJSON != nil {
				// DuckDB v2 might return a Go type, marshal and unmarshal
				if jsonBytes, err := json.Marshal(linksJSON); err == nil {
					json.Unmarshal(jsonBytes, &span.Links)
				}
			}
		}

		spans = append(spans, span)
	}

	return spans, nil
}

// GetServices returns a list of unique service names
func (ts *TracesStore) GetServices(ctx context.Context) ([]string, error) {
	rows, err := ts.db.QueryContext(ctx, `
		SELECT DISTINCT service_name FROM traces ORDER BY service_name
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query services: %w", err)
	}
	defer rows.Close()

	services := []string{}
	for rows.Next() {
		var service string
		if err := rows.Scan(&service); err != nil {
			return nil, fmt.Errorf("failed to scan service: %w", err)
		}
		services = append(services, service)
	}

	return services, nil
}

// TraceFilters holds filter parameters for trace queries
type TraceFilters struct {
	ServiceName string
	MinDuration int64
	MaxDuration int64
	HasErrors   bool
	Search      string // Search in operation_name or trace_id
	StartTime   time.Time
	EndTime     time.Time
	Limit       int
	Offset      int
}
