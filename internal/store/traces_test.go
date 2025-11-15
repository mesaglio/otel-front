package store

import (
	"context"
	"testing"
	"time"

	"go.uber.org/zap"
)

func setupTestStore(t *testing.T) *Store {
	logger, _ := zap.NewDevelopment()
	ctx := context.Background()
	
	store, err := NewStore(ctx, logger)
	if err != nil {
		t.Fatalf("Failed to create store: %v", err)
	}
	
	if err := store.Migrate(ctx); err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}
	
	return store
}

func TestInsertAndGetTrace(t *testing.T) {
	store := setupTestStore(t)
	defer store.Close()
	
	ctx := context.Background()
	
	// Create test trace
	trace := &Trace{
		TraceID:       "test-trace-001",
		ServiceName:   "test-service",
		OperationName: "GET /api/test",
		StartTime:     time.Now().Add(-100 * time.Millisecond),
		EndTime:       time.Now(),
		DurationMs:    100,
		SpanCount:     2,
		ErrorCount:    0,
		StatusCode:    0,
		Attributes:    map[string]interface{}{"test": "value"},
		Spans: []Span{
			{
				SpanID:        "span-001",
				TraceID:       "test-trace-001",
				ServiceName:   "test-service",
				OperationName: "GET /api/test",
				SpanKind:      "server",
				StartTime:     time.Now().Add(-100 * time.Millisecond),
				EndTime:       time.Now(),
				DurationMs:    100,
				StatusCode:    0,
				Attributes:    map[string]interface{}{"http.method": "GET"},
			},
			{
				SpanID:        "span-002",
				TraceID:       "test-trace-001",
				ParentSpanID:  strPtr("span-001"),
				ServiceName:   "test-service",
				OperationName: "DB Query",
				SpanKind:      "client",
				StartTime:     time.Now().Add(-80 * time.Millisecond),
				EndTime:       time.Now().Add(-20 * time.Millisecond),
				DurationMs:    60,
				StatusCode:    0,
				Attributes:    map[string]interface{}{"db.system": "postgresql"},
			},
		},
	}
	
	// Insert trace
	err := store.Traces.InsertTrace(ctx, trace)
	if err != nil {
		t.Fatalf("Failed to insert trace: %v", err)
	}
	
	// Get trace by ID
	retrieved, err := store.Traces.GetTraceByID(ctx, "test-trace-001")
	if err != nil {
		t.Fatalf("Failed to get trace: %v", err)
	}
	
	// Verify
	if retrieved.TraceID != trace.TraceID {
		t.Errorf("Expected trace_id %s, got %s", trace.TraceID, retrieved.TraceID)
	}
	if retrieved.ServiceName != trace.ServiceName {
		t.Errorf("Expected service %s, got %s", trace.ServiceName, retrieved.ServiceName)
	}
	if len(retrieved.Spans) != 2 {
		t.Errorf("Expected 2 spans, got %d", len(retrieved.Spans))
	}
}

func TestGetTracesWithFilters(t *testing.T) {
	store := setupTestStore(t)
	defer store.Close()
	
	ctx := context.Background()
	
	// Insert multiple traces
	traces := []*Trace{
		{
			TraceID:       "trace-1",
			ServiceName:   "service-a",
			OperationName: "GET /api/users",
			StartTime:     time.Now().Add(-200 * time.Millisecond),
			EndTime:       time.Now().Add(-100 * time.Millisecond),
			DurationMs:    100,
			SpanCount:     1,
			ErrorCount:    0,
			StatusCode:    0,
			Spans: []Span{
				{
					SpanID:        "span-1",
					TraceID:       "trace-1",
					ServiceName:   "service-a",
					OperationName: "GET /api/users",
					SpanKind:      "server",
					StartTime:     time.Now().Add(-200 * time.Millisecond),
					EndTime:       time.Now().Add(-100 * time.Millisecond),
					DurationMs:    100,
					StatusCode:    0,
				},
			},
		},
		{
			TraceID:       "trace-2",
			ServiceName:   "service-b",
			OperationName: "POST /api/users",
			StartTime:     time.Now().Add(-100 * time.Millisecond),
			EndTime:       time.Now(),
			DurationMs:    200,
			SpanCount:     1,
			ErrorCount:    1,
			StatusCode:    2,
			Spans: []Span{
				{
					SpanID:        "span-2",
					TraceID:       "trace-2",
					ServiceName:   "service-b",
					OperationName: "POST /api/users",
					SpanKind:      "server",
					StartTime:     time.Now().Add(-100 * time.Millisecond),
					EndTime:       time.Now(),
					DurationMs:    200,
					StatusCode:    2,
				},
			},
		},
	}
	
	for _, trace := range traces {
		if err := store.Traces.InsertTrace(ctx, trace); err != nil {
			t.Fatalf("Failed to insert trace: %v", err)
		}
	}
	
	// Test filter by service
	t.Run("Filter by service", func(t *testing.T) {
		filters := TraceFilters{
			ServiceName: "service-a",
			Limit:       10,
		}
		
		results, err := store.Traces.GetTraces(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to get traces: %v", err)
		}
		
		if len(results) != 1 {
			t.Errorf("Expected 1 trace, got %d", len(results))
		}
		if len(results) > 0 && results[0].ServiceName != "service-a" {
			t.Errorf("Expected service-a, got %s", results[0].ServiceName)
		}
	})
	
	// Test filter by errors
	t.Run("Filter by errors", func(t *testing.T) {
		filters := TraceFilters{
			HasErrors: true,
			Limit:     10,
		}
		
		results, err := store.Traces.GetTraces(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to get traces: %v", err)
		}
		
		if len(results) != 1 {
			t.Errorf("Expected 1 trace with errors, got %d", len(results))
		}
	})
	
	// Test search
	t.Run("Search by operation name", func(t *testing.T) {
		filters := TraceFilters{
			Search: "POST",
			Limit:  10,
		}
		
		results, err := store.Traces.GetTraces(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to get traces: %v", err)
		}
		
		if len(results) != 1 {
			t.Errorf("Expected 1 trace, got %d", len(results))
		}
		if len(results) > 0 && results[0].OperationName != "POST /api/users" {
			t.Errorf("Expected POST operation, got %s", results[0].OperationName)
		}
	})
	
	// Test duration filter
	t.Run("Filter by min duration", func(t *testing.T) {
		filters := TraceFilters{
			MinDuration: 150,
			Limit:       10,
		}
		
		results, err := store.Traces.GetTraces(ctx, filters)
		if err != nil {
			t.Fatalf("Failed to get traces: %v", err)
		}
		
		if len(results) != 1 {
			t.Errorf("Expected 1 trace > 150ms, got %d", len(results))
		}
	})
}

func TestGetServices(t *testing.T) {
	store := setupTestStore(t)
	defer store.Close()
	
	ctx := context.Background()
	
	// Insert traces with different services
	services := []string{"service-a", "service-b", "service-c"}
	for i, svc := range services {
		trace := &Trace{
			TraceID:       string(rune('a' + i)),
			ServiceName:   svc,
			OperationName: "test-op",
			StartTime:     time.Now(),
			EndTime:       time.Now(),
			DurationMs:    10,
			SpanCount:     1,
			Spans: []Span{
				{
					SpanID:        string(rune('a' + i)),
					TraceID:       string(rune('a' + i)),
					ServiceName:   svc,
					OperationName: "test-op",
					SpanKind:      "server",
					StartTime:     time.Now(),
					EndTime:       time.Now(),
					DurationMs:    10,
					StatusCode:    0,
				},
			},
		}
		if err := store.Traces.InsertTrace(ctx, trace); err != nil {
			t.Fatalf("Failed to insert trace: %v", err)
		}
	}
	
	// Get services
	results, err := store.Traces.GetServices(ctx)
	if err != nil {
		t.Fatalf("Failed to get services: %v", err)
	}
	
	if len(results) != 3 {
		t.Errorf("Expected 3 services, got %d", len(results))
	}
}

func strPtr(s string) *string {
	return &s
}

