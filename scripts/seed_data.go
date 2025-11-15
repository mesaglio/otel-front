//go:build seed_data && !send_otlp
// +build seed_data,!send_otlp

package main

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/mesaglio/otel-front/internal/store"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	ctx := context.Background()

	// Connect to database (DuckDB in-memory)
	logger.Info("Initializing DuckDB in-memory database...")
	dataStore, err := store.NewStore(ctx, logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer dataStore.Close()

	// Run migrations
	logger.Info("Running migrations...")
	if err := dataStore.Migrate(ctx); err != nil {
		logger.Fatal("Failed to run migrations", zap.Error(err))
	}

	// Seed data
	logger.Info("Seeding test data...")

	// Create test services
	services := []string{"api-gateway", "user-service", "payment-service", "notification-service"}

	// Generate traces
	logger.Info("Generating traces...")
	for i := 0; i < 20; i++ {
		trace := generateTestTrace(services)
		if err := dataStore.Traces.InsertTrace(ctx, &trace); err != nil {
			logger.Error("Failed to insert trace", zap.Error(err))
		} else {
			logger.Info("Inserted trace", zap.String("trace_id", trace.TraceID))
		}
	}

	// Generate logs
	logger.Info("Generating logs...")
	for i := 0; i < 50; i++ {
		logs := generateTestLogs(services, 5)
		if err := dataStore.Logs.InsertLogs(ctx, logs); err != nil {
			logger.Error("Failed to insert logs", zap.Error(err))
		} else {
			logger.Info("Inserted logs", zap.Int("count", len(logs)))
		}
	}

	// Generate metrics
	logger.Info("Generating metrics...")
	for i := 0; i < 100; i++ {
		metrics := generateTestMetrics(services, 10)
		if err := dataStore.Metrics.InsertMetrics(ctx, metrics); err != nil {
			logger.Error("Failed to insert metrics", zap.Error(err))
		} else {
			logger.Info("Inserted metrics", zap.Int("count", len(metrics)))
		}
	}

	logger.Info("Seeding completed successfully!")
}

func generateTestTrace(services []string) store.Trace {
	traceID := fmt.Sprintf("trace-%d", rand.Int63())
	startTime := time.Now().Add(-time.Duration(rand.Intn(3600)) * time.Second)

	// Generate root span
	rootService := services[0]
	rootSpan := generateSpan(traceID, nil, rootService, "HTTP GET /api/users", startTime)

	spans := []store.Span{rootSpan}
	totalDuration := rootSpan.DurationMs
	errorCount := 0

	if rootSpan.StatusCode == 2 { // Error status
		errorCount++
	}

	// Generate child spans
	currentTime := startTime.Add(time.Duration(rand.Intn(50)) * time.Millisecond)
	for _, service := range services[1:] {
		parentID := rootSpan.SpanID
		childSpan := generateSpan(traceID, &parentID, service, fmt.Sprintf("%s.process", service), currentTime)
		spans = append(spans, childSpan)

		if childSpan.StatusCode == 2 {
			errorCount++
		}

		currentTime = currentTime.Add(time.Duration(childSpan.DurationMs) * time.Millisecond)
		if currentTime.Sub(startTime).Milliseconds() > totalDuration {
			totalDuration = currentTime.Sub(startTime).Milliseconds()
		}
	}

	endTime := startTime.Add(time.Duration(totalDuration) * time.Millisecond)
	statusCode := 0 // OK
	if errorCount > 0 {
		statusCode = 2 // Error
	}

	return store.Trace{
		TraceID:       traceID,
		ServiceName:   rootService,
		OperationName: rootSpan.OperationName,
		StartTime:     startTime,
		EndTime:       endTime,
		DurationMs:    totalDuration,
		SpanCount:     len(spans),
		ErrorCount:    errorCount,
		StatusCode:    statusCode,
		Attributes: map[string]interface{}{
			"http.method": "GET",
			"http.url":    "/api/users",
			"http.status": 200,
		},
		Spans: spans,
	}
}

func generateSpan(traceID string, parentSpanID *string, service, operation string, startTime time.Time) store.Span {
	spanID := fmt.Sprintf("span-%d", rand.Int63())
	duration := int64(rand.Intn(500) + 10) // 10-510ms
	endTime := startTime.Add(time.Duration(duration) * time.Millisecond)

	// 10% chance of error
	statusCode := 0 // OK
	var statusMessage *string
	if rand.Float32() < 0.1 {
		statusCode = 2 // Error
		msg := "Internal server error"
		statusMessage = &msg
	}

	events := []store.SpanEvent{}
	// Add some events
	if rand.Float32() < 0.3 {
		events = append(events, store.SpanEvent{
			Name:      "cache.hit",
			Timestamp: startTime.Add(time.Duration(rand.Intn(int(duration))) * time.Millisecond),
			Attributes: map[string]interface{}{
				"cache.key": "user:123",
			},
		})
	}

	return store.Span{
		SpanID:        spanID,
		TraceID:       traceID,
		ParentSpanID:  parentSpanID,
		ServiceName:   service,
		OperationName: operation,
		SpanKind:      "SPAN_KIND_SERVER",
		StartTime:     startTime,
		EndTime:       endTime,
		DurationMs:    duration,
		StatusCode:    statusCode,
		StatusMessage: statusMessage,
		Attributes: map[string]interface{}{
			"service.name": service,
			"span.kind":    "server",
		},
		Events: events,
		Links:  []store.SpanLink{},
	}
}

func generateTestLogs(services []string, count int) []store.LogRecord {
	logs := make([]store.LogRecord, count)
	severities := []struct {
		text   string
		number int
	}{
		{"INFO", 9},
		{"WARN", 13},
		{"ERROR", 17},
		{"DEBUG", 5},
	}

	messages := []string{
		"User authenticated successfully",
		"Payment processed",
		"Database connection established",
		"Cache miss for key user:123",
		"API request completed",
		"Failed to connect to external service",
		"Invalid input received",
		"Rate limit exceeded",
	}

	for i := 0; i < count; i++ {
		service := services[rand.Intn(len(services))]
		severity := severities[rand.Intn(len(severities))]
		message := messages[rand.Intn(len(messages))]
		timestamp := time.Now().Add(-time.Duration(rand.Intn(7200)) * time.Second)

		var traceID *string
		// 30% of logs are associated with traces
		if rand.Float32() < 0.3 {
			tid := fmt.Sprintf("trace-%d", rand.Int63())
			traceID = &tid
		}

		logs[i] = store.LogRecord{
			Timestamp:      timestamp,
			TraceID:        traceID,
			SeverityText:   severity.text,
			SeverityNumber: severity.number,
			Body:           message,
			ServiceName:    service,
			Attributes: map[string]interface{}{
				"service.name": service,
				"host.name":    "server-01",
			},
			ResourceAttributes: map[string]interface{}{
				"service.version": "1.0.0",
			},
		}
	}

	return logs
}

func generateTestMetrics(services []string, count int) []store.MetricRecord {
	metrics := make([]store.MetricRecord, count)

	metricNames := []string{
		"http.server.request.duration",
		"http.server.requests",
		"system.cpu.usage",
		"system.memory.usage",
		"db.query.duration",
	}

	metricTypes := []string{"gauge", "sum", "histogram"}

	for i := 0; i < count; i++ {
		service := services[rand.Intn(len(services))]
		metricName := metricNames[rand.Intn(len(metricNames))]
		metricType := metricTypes[rand.Intn(len(metricTypes))]
		timestamp := time.Now().Add(-time.Duration(rand.Intn(3600)) * time.Second)
		value := rand.Float64() * 100

		metrics[i] = store.MetricRecord{
			Timestamp:   timestamp,
			MetricName:  metricName,
			MetricType:  metricType,
			ServiceName: service,
			Value:       &value,
			Attributes: map[string]interface{}{
				"service.name": service,
				"environment":  "production",
			},
			Exemplars: []store.Exemplar{},
		}
	}

	return metrics
}
