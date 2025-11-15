package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"go.uber.org/zap"
)

// MetricsStore handles metric storage and retrieval
type MetricsStore struct {
	db     *sql.DB
	logger *zap.Logger
}

// NewMetricsStore creates a new metrics store
func NewMetricsStore(db *sql.DB, logger *zap.Logger) *MetricsStore {
	return &MetricsStore{
		db:     db,
		logger: logger,
	}
}

// MetricRecord represents a single metric data point
type MetricRecord struct {
	ID          int64                  `json:"id"`
	Timestamp   time.Time              `json:"timestamp"`
	MetricName  string                 `json:"metric_name"`
	MetricType  string                 `json:"metric_type"` // gauge, sum, histogram, exponential_histogram
	ServiceName string                 `json:"service_name"`
	Value       *float64               `json:"value,omitempty"`
	Attributes  map[string]interface{} `json:"attributes,omitempty"`
	Exemplars   []Exemplar             `json:"exemplars,omitempty"`
}

// Exemplar represents an exemplar linking a metric to a trace
type Exemplar struct {
	Value      float64                `json:"value"`
	Timestamp  time.Time              `json:"timestamp"`
	TraceID    string                 `json:"trace_id"`
	SpanID     string                 `json:"span_id"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

// InsertMetric inserts a new metric record
func (ms *MetricsStore) InsertMetric(ctx context.Context, metric *MetricRecord) error {
	attributesJSON, _ := json.Marshal(metric.Attributes)
	exemplarsJSON, _ := json.Marshal(metric.Exemplars)

	err := ms.db.QueryRowContext(ctx, `
		INSERT INTO metrics (timestamp, metric_name, metric_type, service_name,
			value, attributes, exemplars)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, metric.Timestamp, metric.MetricName, metric.MetricType, metric.ServiceName,
		metric.Value, string(attributesJSON), string(exemplarsJSON)).Scan(&metric.ID)

	if err != nil {
		return fmt.Errorf("failed to insert metric: %w", err)
	}

	return nil
}

// InsertMetrics inserts multiple metric records in a batch
func (ms *MetricsStore) InsertMetrics(ctx context.Context, metrics []MetricRecord) error {
	if len(metrics) == 0 {
		return nil
	}

	tx, err := ms.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	for _, metric := range metrics {
		attributesJSON, _ := json.Marshal(metric.Attributes)
		exemplarsJSON, _ := json.Marshal(metric.Exemplars)

		_, err = tx.ExecContext(ctx, `
			INSERT INTO metrics (timestamp, metric_name, metric_type, service_name,
				value, attributes, exemplars)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, metric.Timestamp, metric.MetricName, metric.MetricType, metric.ServiceName,
			metric.Value, string(attributesJSON), string(exemplarsJSON))

		if err != nil {
			return fmt.Errorf("failed to insert metric: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetMetrics retrieves metrics with filters
func (ms *MetricsStore) GetMetrics(ctx context.Context, filters MetricFilters) ([]MetricRecord, error) {
	query := `
		SELECT id, timestamp, metric_name, metric_type, service_name,
			value, attributes, exemplars
		FROM metrics
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

	if filters.MetricName != "" {
		query += " AND metric_name = ?"
		args = append(args, filters.MetricName)
	}

	if filters.MetricType != "" {
		query += " AND metric_type = ?"
		args = append(args, filters.MetricType)
	}

	if filters.ServiceName != "" {
		query += " AND service_name = ?"
		args = append(args, filters.ServiceName)
	}

	query += " ORDER BY timestamp DESC"

	if filters.Limit > 0 {
		query += " LIMIT ?"
		args = append(args, filters.Limit)
	}

	if filters.Offset > 0 {
		query += " OFFSET ?"
		args = append(args, filters.Offset)
	}

	rows, err := ms.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query metrics: %w", err)
	}
	defer rows.Close()

	metrics := []MetricRecord{}
	for rows.Next() {
		var metric MetricRecord
		var attributesJSON, exemplarsJSON any

		err := rows.Scan(&metric.ID, &metric.Timestamp, &metric.MetricName,
			&metric.MetricType, &metric.ServiceName, &metric.Value,
			&attributesJSON, &exemplarsJSON)
		if err != nil {
			return nil, fmt.Errorf("failed to scan metric: %w", err)
		}

		// Handle JSON columns - DuckDB v2 returns map/array directly
		if attributesJSON != nil {
			if m, ok := attributesJSON.(map[string]any); ok {
				metric.Attributes = m
			} else if bytes, ok := attributesJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &metric.Attributes)
			} else if str, ok := attributesJSON.(string); ok && len(str) > 0 {
				json.Unmarshal([]byte(str), &metric.Attributes)
			}
		}
		if exemplarsJSON != nil {
			// For complex types, convert to JSON and unmarshal
			if bytes, ok := exemplarsJSON.([]byte); ok && len(bytes) > 0 {
				json.Unmarshal(bytes, &metric.Exemplars)
			} else if str, ok := exemplarsJSON.(string); ok && len(str) > 0 {
				json.Unmarshal([]byte(str), &metric.Exemplars)
			} else if exemplarsJSON != nil {
				// DuckDB v2 might return a Go type, marshal and unmarshal
				if jsonBytes, err := json.Marshal(exemplarsJSON); err == nil {
					json.Unmarshal(jsonBytes, &metric.Exemplars)
				}
			}
		}

		metrics = append(metrics, metric)
	}

	return metrics, nil
}

// GetMetricsCount returns the total count of metrics in the database
func (ms *MetricsStore) GetMetricsCount(ctx context.Context) (int64, error) {
	var count int64
	err := ms.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM metrics").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count metrics: %w", err)
	}
	return count, nil
}

// GetMetricNames returns a list of unique metric names
func (ms *MetricsStore) GetMetricNames(ctx context.Context, serviceName string) ([]string, error) {
	query := "SELECT DISTINCT metric_name FROM metrics"
	args := []interface{}{}

	if serviceName != "" {
		query += " WHERE service_name = ?"
		args = append(args, serviceName)
	}

	query += " ORDER BY metric_name"

	rows, err := ms.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query metric names: %w", err)
	}
	defer rows.Close()

	names := []string{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("failed to scan metric name: %w", err)
		}
		names = append(names, name)
	}

	return names, nil
}

// AggregateMetrics computes aggregations over a time range
func (ms *MetricsStore) AggregateMetrics(ctx context.Context, req AggregationRequest) ([]AggregationResult, error) {
	// Build aggregation function
	aggFunc := "AVG"
	switch req.Aggregation {
	case "sum":
		aggFunc = "SUM"
	case "min":
		aggFunc = "MIN"
	case "max":
		aggFunc = "MAX"
	case "count":
		aggFunc = "COUNT"
	case "avg":
		aggFunc = "AVG"
	}

	// Convert bucket size to DuckDB-compatible interval
	bucketSeconds := parseBucketSizeToSeconds(req.BucketSize)

	// Build the bucket expression using epoch seconds and integer division
	// This floors the timestamp to the nearest bucket
	query := fmt.Sprintf(`
		SELECT
			to_timestamp((CAST(EXTRACT(epoch FROM timestamp) AS BIGINT) / %d) * %d) AS bucket,
			%s(value) AS value
		FROM metrics
		WHERE metric_name = ?
			AND timestamp >= ?
			AND timestamp <= ?
	`, bucketSeconds, bucketSeconds, aggFunc)

	args := []interface{}{req.MetricName, req.StartTime, req.EndTime}

	if req.ServiceName != "" {
		query += " AND service_name = ?"
		args = append(args, req.ServiceName)
	}

	query += " GROUP BY bucket ORDER BY bucket ASC"

	rows, err := ms.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate metrics: %w", err)
	}
	defer rows.Close()

	results := []AggregationResult{}
	for rows.Next() {
		var result AggregationResult
		if err := rows.Scan(&result.TimeBucket, &result.Value); err != nil {
			return nil, fmt.Errorf("failed to scan aggregation result: %w", err)
		}
		// Fill in the metadata
		result.MetricName = req.MetricName
		result.AggregationType = req.Aggregation
		// Unit could be fetched from the first metric record, but we'll leave it empty for now
		results = append(results, result)
	}

	return results, nil
}

// MetricFilters holds filter parameters for metric queries
type MetricFilters struct {
	StartTime   time.Time
	EndTime     time.Time
	MetricName  string
	MetricType  string
	ServiceName string
	Limit       int
	Offset      int
}

// AggregationRequest holds parameters for metric aggregation
type AggregationRequest struct {
	MetricName  string    `json:"metric_name"`
	ServiceName string    `json:"service_name,omitempty"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Aggregation string    `json:"aggregation_type"` // avg, sum, min, max, count
	BucketSize  string    `json:"time_bucket"`      // e.g., "1 minute", "5 minutes", "1 hour"
}

// AggregationResult holds the result of a metric aggregation
type AggregationResult struct {
	TimeBucket      time.Time `json:"time_bucket"`
	MetricName      string    `json:"metric_name"`
	AggregationType string    `json:"aggregation_type"`
	Value           float64   `json:"value"`
	Unit            string    `json:"unit,omitempty"`
}

// parseBucketSizeToSeconds converts bucket size strings to seconds
func parseBucketSizeToSeconds(bucketSize string) int64 {
	switch bucketSize {
	case "1 minute":
		return 60
	case "5 minutes":
		return 300
	case "15 minutes":
		return 900
	case "30 minutes":
		return 1800
	case "1 hour":
		return 3600
	case "6 hours":
		return 21600
	default:
		return 60 // default to 1 minute
	}
}
