package store

import (
	"context"
	"testing"
	"time"

	"go.uber.org/zap"
)

func TestInsertAndGetLogs(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	ctx := context.Background()
	
	store, err := NewStore(ctx, logger)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()
	
	if err := store.Migrate(ctx); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}
	
	// Create test log
	log := &LogRecord{
		Timestamp:          time.Now(),
		TraceID:            strPtr("test-trace-001"),
		SpanID:             strPtr("test-span-001"),
		SeverityNumber:     9,
		SeverityText:       "INFO",
		ServiceName:        "test-service",
		Body:               "Test log message",
		Attributes:         map[string]interface{}{"user.id": "123"},
		ResourceAttributes: map[string]interface{}{"host.name": "localhost"},
	}
	
	// Insert log
	err = store.Logs.InsertLog(ctx, log)
	if err != nil {
		t.Fatalf("Failed to insert log: %v", err)
	}
	
	// Get logs
	filters := LogFilters{Limit: 10}
	results, err := store.Logs.GetLogs(ctx, filters)
	if err != nil {
		t.Fatalf("Failed to get logs: %v", err)
	}
	
	if len(results) != 1 {
		t.Errorf("Expected 1 log, got %d", len(results))
	}
	
	if len(results) > 0 {
		if results[0].Body != "Test log message" {
			t.Errorf("Expected body 'Test log message', got %s", results[0].Body)
		}
		if results[0].ServiceName != "test-service" {
			t.Errorf("Expected service 'test-service', got %s", results[0].ServiceName)
		}
	}
}

func TestLogFilters(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	ctx := context.Background()
	
	store, err := NewStore(ctx, logger)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()
	
	if err := store.Migrate(ctx); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}
	
	// Insert multiple logs
	logs := []LogRecord{
		{
			Timestamp:      time.Now().Add(-3 * time.Minute),
			TraceID:        strPtr("trace-1"),
			SeverityNumber: 9,
			SeverityText:   "INFO",
			ServiceName:    "service-a",
			Body:           "User logged in successfully",
		},
		{
			Timestamp:      time.Now().Add(-2 * time.Minute),
			TraceID:        strPtr("trace-2"),
			SeverityNumber: 17,
			SeverityText:   "ERROR",
			ServiceName:    "service-b",
			Body:           "Database connection failed",
		},
		{
			Timestamp:      time.Now().Add(-1 * time.Minute),
			TraceID:        strPtr("trace-1"),
			SeverityNumber: 13,
			SeverityText:   "WARN",
			ServiceName:    "service-a",
			Body:           "Slow query detected",
		},
	}
	
	for _, log := range logs {
		logCopy := log
		if err := store.Logs.InsertLog(ctx, &logCopy); err != nil {
			t.Fatalf("Failed to insert log: %v", err)
		}
	}
	
	// Test filter by severity
	t.Run("Filter by severity", func(t *testing.T) {
		filters := LogFilters{
			MinSeverity: 17,
			Limit:       10,
		}
		
		results, err := store.Logs.GetLogs(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to get logs: %v", err)
		}
		
		if len(results) != 1 {
			t.Errorf("Expected 1 ERROR log, got %d", len(results))
		}
	})
	
	// Test filter by service
	t.Run("Filter by service", func(t *testing.T) {
		filters := LogFilters{
			ServiceName: "service-a",
			Limit:       10,
		}
		
		results, err := store.Logs.GetLogs(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to get logs: %v", err)
		}
		
		if len(results) != 2 {
			t.Errorf("Expected 2 logs from service-a, got %d", len(results))
		}
	})
	
	// Test search
	t.Run("Search in log body", func(t *testing.T) {
		filters := LogFilters{
			SearchText: "Database",
			Limit:      10,
		}
		
		results, err := store.Logs.GetLogs(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to get logs: %v", err)
		}
		
		if len(results) != 1 {
			t.Errorf("Expected 1 log with 'Database', got %d", len(results))
		}
	})
	
	// Test filter by trace_id
	t.Run("Filter by trace_id", func(t *testing.T) {
		filters := LogFilters{
			TraceID: "trace-1",
			Limit:   10,
		}
		
		results, err := store.Logs.GetLogs(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to get logs: %v", err)
		}
		
		if len(results) != 2 {
			t.Errorf("Expected 2 logs for trace-1, got %d", len(results))
		}
	})
}

func TestGetLogsByTraceID(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	ctx := context.Background()
	
	store, err := NewStore(ctx, logger)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	defer store.Close()
	
	if err := store.Migrate(ctx); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}
	
	traceID := "test-trace-correlation"
	
	// Insert logs for specific trace
	for i := 0; i < 3; i++ {
		log := &LogRecord{
			Timestamp:      time.Now(),
			TraceID:        &traceID,
			SeverityNumber: 9,
			SeverityText:   "INFO",
			ServiceName:    "test-service",
			Body:           "Test message",
		}
		if err := store.Logs.InsertLog(ctx, log); err != nil {
			t.Fatalf("Failed to insert log: %v", err)
		}
	}
	
	// Get logs by trace ID
	results, err := store.Logs.GetLogsByTraceID(ctx, traceID)
	if err != nil {
		t.Fatalf("Failed to get logs by trace_id: %v", err)
	}
	
	if len(results) != 3 {
		t.Errorf("Expected 3 logs for trace, got %d", len(results))
	}
}

