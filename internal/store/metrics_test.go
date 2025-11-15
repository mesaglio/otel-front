package store

import (
	"context"
	"testing"
	"time"

	"go.uber.org/zap"
)

func TestInsertAndGetMetrics(t *testing.T) {
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
	
	// Create test metric
	value := 42.5
	metric := &MetricRecord{
		Timestamp:   time.Now(),
		MetricName:  "http.server.duration",
		MetricType:  "histogram",
		ServiceName: "test-service",
		Value:       &value,
		Attributes:  map[string]interface{}{"http.method": "GET"},
	}
	
	// Insert metric
	err = store.Metrics.InsertMetric(ctx, metric)
	if err != nil {
		t.Fatalf("Failed to insert metric: %v", err)
	}
	
	// Get metrics
	filters := MetricFilters{Limit: 10}
	results, err := store.Metrics.GetMetrics(ctx, filters)
	if err != nil {
		t.Fatalf("Failed to get metrics: %v", err)
	}
	
	if len(results) != 1 {
		t.Errorf("Expected 1 metric, got %d", len(results))
	}
	
	if len(results) > 0 {
		if results[0].MetricName != "http.server.duration" {
			t.Errorf("Expected metric name 'http.server.duration', got %s", results[0].MetricName)
		}
		if *results[0].Value != 42.5 {
			t.Errorf("Expected value 42.5, got %f", *results[0].Value)
		}
	}
}

func TestGetMetricNames(t *testing.T) {
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
	
	// Insert metrics with different names
	metricNames := []string{"metric.a", "metric.b", "metric.c"}
	for _, name := range metricNames {
		value := 1.0
		metric := &MetricRecord{
			Timestamp:   time.Now(),
			MetricName:  name,
			MetricType:  "gauge",
			ServiceName: "test-service",
			Value:       &value,
		}
		if err := store.Metrics.InsertMetric(ctx, metric); err != nil {
			t.Fatalf("Failed to insert metric: %v", err)
		}
	}
	
	// Get metric names
	names, err := store.Metrics.GetMetricNames(ctx, "")
	if err != nil {
		t.Fatalf("Failed to get metric names: %v", err)
	}
	
	if len(names) != 3 {
		t.Errorf("Expected 3 metric names, got %d", len(names))
	}
}

func TestAggregateMetrics(t *testing.T) {
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
	
	// Insert metrics over time
	now := time.Now()
	for i := 0; i < 10; i++ {
		value := float64(100 + i*10)
		metric := &MetricRecord{
			Timestamp:   now.Add(time.Duration(i) * time.Minute),
			MetricName:  "http.server.requests",
			MetricType:  "sum",
			ServiceName: "test-service",
			Value:       &value,
		}
		if err := store.Metrics.InsertMetric(ctx, metric); err != nil {
			t.Fatalf("Failed to insert metric: %v", err)
		}
	}
	
	// Test aggregation
	t.Run("AVG aggregation", func(t *testing.T) {
		req := AggregationRequest{
			MetricName:  "http.server.requests",
			ServiceName: "",
			StartTime:   now.Add(-1 * time.Minute),
			EndTime:     now.Add(11 * time.Minute),
			Aggregation: "avg",
			BucketSize:  "5 minutes",
		}
		
		results, err := store.Metrics.AggregateMetrics(ctx, req)
		if err != nil {
			t.Fatalf("Failed to aggregate metrics: %v", err)
		}
		
		if len(results) == 0 {
			t.Error("Expected aggregation results, got none")
		}
		
		// Verify result structure
		if len(results) > 0 {
			if results[0].MetricName != "http.server.requests" {
				t.Errorf("Expected metric_name 'http.server.requests', got %s", results[0].MetricName)
			}
			if results[0].AggregationType != "avg" {
				t.Errorf("Expected aggregation_type 'avg', got %s", results[0].AggregationType)
			}
		}
	})
	
	t.Run("SUM aggregation", func(t *testing.T) {
		req := AggregationRequest{
			MetricName:  "http.server.requests",
			StartTime:   now.Add(-1 * time.Minute),
			EndTime:     now.Add(11 * time.Minute),
			Aggregation: "sum",
			BucketSize:  "5 minutes",
		}
		
		results, err := store.Metrics.AggregateMetrics(ctx, req)
		if err != nil {
			t.Fatalf("Failed to aggregate metrics: %v", err)
		}
		
		if len(results) == 0 {
			t.Error("Expected aggregation results, got none")
		}
	})
}

