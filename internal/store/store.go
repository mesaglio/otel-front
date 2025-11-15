package store

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/duckdb/duckdb-go/v2"
	"go.uber.org/zap"
)

// Store manages database connections and operations
type Store struct {
	db     *sql.DB
	logger *zap.Logger

	// Sub-stores for different data types
	Traces  *TracesStore
	Logs    *LogsStore
	Metrics *MetricsStore
}

// NewStore creates a new database store with DuckDB in-memory database
func NewStore(ctx context.Context, logger *zap.Logger) (*Store, error) {
	// Open DuckDB in-memory database
	db, err := sql.Open("duckdb", "")
	if err != nil {
		return nil, fmt.Errorf("failed to open DuckDB: %w", err)
	}

	// Test connection
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.Info("Successfully connected to DuckDB in-memory database")

	store := &Store{
		db:     db,
		logger: logger,
	}

	// Initialize sub-stores
	store.Traces = NewTracesStore(db, logger)
	store.Logs = NewLogsStore(db, logger)
	store.Metrics = NewMetricsStore(db, logger)

	return store, nil
}

// Close closes the database connection
func (s *Store) Close() {
	s.db.Close()
	s.logger.Info("Database connection closed")
}

// Migrate runs database migrations
func (s *Store) Migrate(ctx context.Context) error {
	s.logger.Info("Running database migrations...")

	// Create tables
	migrations := []string{
		// Create sequences first
		`CREATE SEQUENCE IF NOT EXISTS logs_id_seq START 1;`,
		`CREATE SEQUENCE IF NOT EXISTS metrics_id_seq START 1;`,

		// Traces table
		`CREATE TABLE IF NOT EXISTS traces (
			trace_id VARCHAR PRIMARY KEY,
			service_name VARCHAR NOT NULL,
			operation_name VARCHAR NOT NULL,
			start_time TIMESTAMP NOT NULL,
			end_time TIMESTAMP NOT NULL,
			duration_ms BIGINT NOT NULL,
			span_count INTEGER NOT NULL,
			error_count INTEGER NOT NULL,
			status_code INTEGER NOT NULL,
			attributes JSON,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		// Spans table
		`CREATE TABLE IF NOT EXISTS spans (
			span_id VARCHAR PRIMARY KEY,
			trace_id VARCHAR NOT NULL,
			parent_span_id VARCHAR,
			service_name VARCHAR NOT NULL,
			operation_name VARCHAR NOT NULL,
			span_kind VARCHAR NOT NULL,
			start_time TIMESTAMP NOT NULL,
			end_time TIMESTAMP NOT NULL,
			duration_ms BIGINT NOT NULL,
			status_code INTEGER NOT NULL,
			status_message VARCHAR,
			attributes JSON,
			events JSON,
			links JSON,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		// Logs table
		`CREATE TABLE IF NOT EXISTS logs (
			id BIGINT PRIMARY KEY DEFAULT nextval('logs_id_seq'),
			timestamp TIMESTAMP NOT NULL,
			trace_id VARCHAR,
			span_id VARCHAR,
			severity_text VARCHAR NOT NULL,
			severity_number INTEGER NOT NULL,
			body VARCHAR NOT NULL,
			service_name VARCHAR NOT NULL,
			attributes JSON,
			resource_attributes JSON,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		// Metrics table
		`CREATE TABLE IF NOT EXISTS metrics (
			id BIGINT PRIMARY KEY DEFAULT nextval('metrics_id_seq'),
			timestamp TIMESTAMP NOT NULL,
			metric_name VARCHAR NOT NULL,
			metric_type VARCHAR NOT NULL,
			service_name VARCHAR NOT NULL,
			value DOUBLE,
			attributes JSON,
			exemplars JSON,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		// Create indexes for performance (DuckDB creates them automatically for PKs)
		`CREATE INDEX IF NOT EXISTS idx_traces_start_time ON traces(start_time);`,
		`CREATE INDEX IF NOT EXISTS idx_traces_service_name ON traces(service_name);`,
		`CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);`,
		`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);`,
		`CREATE INDEX IF NOT EXISTS idx_logs_trace_id ON logs(trace_id);`,
		`CREATE INDEX IF NOT EXISTS idx_logs_service_name ON logs(service_name);`,
		`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);`,
		`CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);`,
		`CREATE INDEX IF NOT EXISTS idx_metrics_service_name ON metrics(service_name);`,
	}

	for i, migration := range migrations {
		if _, err := s.db.ExecContext(ctx, migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}

	s.logger.Info("Database migrations completed successfully")
	return nil
}
