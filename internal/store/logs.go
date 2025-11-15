package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"go.uber.org/zap"
)

// LogsStore handles log storage and retrieval
type LogsStore struct {
	db     *sql.DB
	logger *zap.Logger
}

// NewLogsStore creates a new logs store
func NewLogsStore(db *sql.DB, logger *zap.Logger) *LogsStore {
	return &LogsStore{
		db:     db,
		logger: logger,
	}
}

// LogRecord represents a single log entry
type LogRecord struct {
	ID                 int64                  `json:"id"`
	Timestamp          time.Time              `json:"timestamp"`
	TraceID            *string                `json:"trace_id,omitempty"`
	SpanID             *string                `json:"span_id,omitempty"`
	SeverityText       string                 `json:"severity_text"`
	SeverityNumber     int                    `json:"severity_number"`
	Body               string                 `json:"body"`
	ServiceName        string                 `json:"service_name"`
	Attributes         map[string]interface{} `json:"attributes,omitempty"`
	ResourceAttributes map[string]interface{} `json:"resource_attributes,omitempty"`
}

// InsertLog inserts a new log record
func (ls *LogsStore) InsertLog(ctx context.Context, log *LogRecord) error {
	attributesJSON, _ := json.Marshal(log.Attributes)
	resourceAttrJSON, _ := json.Marshal(log.ResourceAttributes)

	err := ls.db.QueryRowContext(ctx, `
		INSERT INTO logs (timestamp, trace_id, span_id, severity_text, severity_number,
			body, service_name, attributes, resource_attributes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, log.Timestamp, log.TraceID, log.SpanID, log.SeverityText, log.SeverityNumber,
		log.Body, log.ServiceName, string(attributesJSON), string(resourceAttrJSON)).Scan(&log.ID)

	if err != nil {
		return fmt.Errorf("failed to insert log: %w", err)
	}

	return nil
}

// InsertLogs inserts multiple log records in a batch
func (ls *LogsStore) InsertLogs(ctx context.Context, logs []LogRecord) error {
	if len(logs) == 0 {
		return nil
	}

	tx, err := ls.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	for _, log := range logs {
		attributesJSON, _ := json.Marshal(log.Attributes)
		resourceAttrJSON, _ := json.Marshal(log.ResourceAttributes)

		_, err = tx.ExecContext(ctx, `
			INSERT INTO logs (timestamp, trace_id, span_id, severity_text, severity_number,
				body, service_name, attributes, resource_attributes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, log.Timestamp, log.TraceID, log.SpanID, log.SeverityText, log.SeverityNumber,
			log.Body, log.ServiceName, string(attributesJSON), string(resourceAttrJSON))

		if err != nil {
			return fmt.Errorf("failed to insert log: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetLogs retrieves logs with filters
func (ls *LogsStore) GetLogs(ctx context.Context, filters LogFilters) ([]LogRecord, error) {
	query := `
		SELECT id, timestamp, trace_id, span_id, severity_text, severity_number,
			body, service_name, attributes, resource_attributes
		FROM logs
		WHERE 1=1
	`
	args := []interface{}{}

	if !filters.StartTime.IsZero() {
		query += " AND timestamp >= ?"
		args = append(args, filters.StartTime)
	}

	if !filters.EndTime.IsZero() {
		query += " AND timestamp <= ?"
		args = append(args, filters.EndTime)
	}

	if filters.ServiceName != "" {
		query += " AND service_name = ?"
		args = append(args, filters.ServiceName)
	}

	if filters.TraceID != "" {
		query += " AND trace_id = ?"
		args = append(args, filters.TraceID)
	}

	if filters.MinSeverity > 0 {
		query += " AND severity_number >= ?"
		args = append(args, filters.MinSeverity)
	}

	if filters.SearchText != "" {
		query += " AND body LIKE ?"
		args = append(args, "%"+filters.SearchText+"%")
	}

	query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
	args = append(args, filters.Limit, filters.Offset)

	rows, err := ls.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query logs: %w", err)
	}
	defer rows.Close()

	logs := []LogRecord{}
	for rows.Next() {
		var log LogRecord
		var attributesJSON, resourceAttrJSON any

		err := rows.Scan(&log.ID, &log.Timestamp, &log.TraceID, &log.SpanID,
			&log.SeverityText, &log.SeverityNumber, &log.Body, &log.ServiceName,
			&attributesJSON, &resourceAttrJSON)
		if err != nil {
			return nil, fmt.Errorf("failed to scan log: %w", err)
		}

		// Handle JSON columns - DuckDB v2 returns map directly
		if attributesJSON != nil {
			if m, ok := attributesJSON.(map[string]any); ok {
				log.Attributes = m
			} else if bytes, ok := attributesJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &log.Attributes)
			}
		}
		if resourceAttrJSON != nil {
			if m, ok := resourceAttrJSON.(map[string]any); ok {
				log.ResourceAttributes = m
			} else if bytes, ok := resourceAttrJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &log.ResourceAttributes)
			}
		}

		logs = append(logs, log)
	}

	return logs, nil
}

// GetLogsByTraceID retrieves all logs associated with a trace
func (ls *LogsStore) GetLogsByTraceID(ctx context.Context, traceID string) ([]LogRecord, error) {
	rows, err := ls.db.QueryContext(ctx, `
		SELECT id, timestamp, trace_id, span_id, severity_text, severity_number,
			body, service_name, attributes, resource_attributes
		FROM logs
		WHERE trace_id = ?
		ORDER BY timestamp ASC
	`, traceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query logs: %w", err)
	}
	defer rows.Close()

	logs := []LogRecord{}
	for rows.Next() {
		var log LogRecord
		var attributesJSON, resourceAttrJSON any

		err := rows.Scan(&log.ID, &log.Timestamp, &log.TraceID, &log.SpanID,
			&log.SeverityText, &log.SeverityNumber, &log.Body, &log.ServiceName,
			&attributesJSON, &resourceAttrJSON)
		if err != nil {
			return nil, fmt.Errorf("failed to scan log: %w", err)
		}

		// Handle JSON columns - DuckDB v2 returns map directly
		if attributesJSON != nil {
			if m, ok := attributesJSON.(map[string]any); ok {
				log.Attributes = m
			} else if bytes, ok := attributesJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &log.Attributes)
			}
		}
		if resourceAttrJSON != nil {
			if m, ok := resourceAttrJSON.(map[string]any); ok {
				log.ResourceAttributes = m
			} else if bytes, ok := resourceAttrJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &log.ResourceAttributes)
			}
		}

		logs = append(logs, log)
	}

	return logs, nil
}

// CountLogs returns the total count of logs matching the filters
func (ls *LogsStore) CountLogs(ctx context.Context, filters LogFilters) (int64, error) {
	query := "SELECT COUNT(*) FROM logs WHERE 1=1"
	args := []interface{}{}

	if !filters.StartTime.IsZero() {
		query += " AND timestamp >= ?"
		args = append(args, filters.StartTime)
	}

	if !filters.EndTime.IsZero() {
		query += " AND timestamp <= ?"
		args = append(args, filters.EndTime)
	}

	if filters.ServiceName != "" {
		query += " AND service_name = ?"
		args = append(args, filters.ServiceName)
	}

	if filters.MinSeverity > 0 {
		query += " AND severity_number >= ?"
		args = append(args, filters.MinSeverity)
	}

	if filters.SearchText != "" {
		query += " AND body LIKE ?"
		args = append(args, "%"+filters.SearchText+"%")
	}

	var count int64
	err := ls.db.QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count logs: %w", err)
	}

	return count, nil
}

// LogFilters holds filter parameters for log queries
type LogFilters struct {
	StartTime   time.Time
	EndTime     time.Time
	ServiceName string
	TraceID     string
	MinSeverity int
	SearchText  string
	Limit       int
	Offset      int
}
