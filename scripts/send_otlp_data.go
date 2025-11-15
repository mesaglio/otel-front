//go:build send_otlp && !seed_data
// +build send_otlp,!seed_data

package main

import (
	"bytes"
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/plog/plogotlp"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/pmetric/pmetricotlp"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/collector/pdata/ptrace/ptraceotlp"
)

// Operation represents a CRUD operation
type Operation struct {
	Method     string
	Path       string
	StatusCode int
	Duration   time.Duration
	HasError   bool
}

var operations = []Operation{
	{Method: "GET", Path: "/api/users", StatusCode: 200, Duration: 50 * time.Millisecond, HasError: false},
	{Method: "GET", Path: "/api/users/{id}", StatusCode: 200, Duration: 30 * time.Millisecond, HasError: false},
	{Method: "POST", Path: "/api/users", StatusCode: 201, Duration: 120 * time.Millisecond, HasError: false},
	{Method: "PUT", Path: "/api/users/{id}", StatusCode: 200, Duration: 80 * time.Millisecond, HasError: false},
	{Method: "DELETE", Path: "/api/users/{id}", StatusCode: 204, Duration: 40 * time.Millisecond, HasError: false},
	{Method: "GET", Path: "/api/users/{id}", StatusCode: 404, Duration: 20 * time.Millisecond, HasError: true},
	{Method: "POST", Path: "/api/users", StatusCode: 400, Duration: 15 * time.Millisecond, HasError: true},
}

func main() {
	endpoint := flag.String("endpoint", "http://localhost:4318", "OTLP HTTP endpoint")
	count := flag.Int("count", 10, "Number of CRUD operations to simulate")
	flag.Parse()

	ctx := context.Background()

	log.Printf("Sending OTLP data to %s", *endpoint)
	log.Printf("Simulating %d CRUD operations...", *count)

	// Send traces, logs and metrics together for each operation
	for i := 0; i < *count; i++ {
		op := operations[i%len(operations)]

		log.Printf("[%d/%d] Simulating: %s %s", i+1, *count, op.Method, op.Path)

		traceID := pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, byte(i)})

		// Send trace for this operation
		if err := sendOperationTrace(ctx, *endpoint, traceID, op, i); err != nil {
			log.Printf("  ✗ Error sending trace: %v", err)
		}

		// Send logs for this operation
		if err := sendOperationLogs(ctx, *endpoint, traceID, op, i); err != nil {
			log.Printf("  ✗ Error sending logs: %v", err)
		}

		// Send metrics for this operation
		if err := sendOperationMetrics(ctx, *endpoint, op, i); err != nil {
			log.Printf("  ✗ Error sending metrics: %v", err)
		}

		log.Printf("  ✓ Operation %d completed", i+1)

		// Small delay between operations
		time.Sleep(100 * time.Millisecond)
	}

	log.Println("✓ Done! All CRUD operations sent successfully.")
}

func sendOperationTrace(ctx context.Context, endpoint string, traceID pcommon.TraceID, op Operation, index int) error {
	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()

	// Resource attributes
	rs.Resource().Attributes().PutStr("service.name", "user-api")
	rs.Resource().Attributes().PutStr("service.version", "1.2.3")
	rs.Resource().Attributes().PutStr("deployment.environment", "production")
	rs.Resource().Attributes().PutStr("host.name", "api-server-01")

	ss := rs.ScopeSpans().AppendEmpty()
	ss.Scope().SetName("user-api-instrumentation")
	ss.Scope().SetVersion("1.0.0")

	now := time.Now()
	startTime := now.Add(-op.Duration)

	// Root span - HTTP Server
	rootSpan := ss.Spans().AppendEmpty()
	rootSpanID := pcommon.SpanID([8]byte{1, 0, 0, 0, 0, 0, 0, byte(index)})
	rootSpan.SetTraceID(traceID)
	rootSpan.SetSpanID(rootSpanID)
	rootSpan.SetName(fmt.Sprintf("%s %s", op.Method, op.Path))
	rootSpan.SetKind(ptrace.SpanKindServer)
	rootSpan.SetStartTimestamp(pcommon.NewTimestampFromTime(startTime))
	rootSpan.SetEndTimestamp(pcommon.NewTimestampFromTime(now))

	if op.HasError {
		rootSpan.Status().SetCode(ptrace.StatusCodeError)
		rootSpan.Status().SetMessage(getErrorMessage(op))
	} else {
		rootSpan.Status().SetCode(ptrace.StatusCodeOk)
	}

	rootSpan.Attributes().PutStr("http.method", op.Method)
	rootSpan.Attributes().PutStr("http.route", op.Path)
	rootSpan.Attributes().PutStr("http.target", op.Path)
	rootSpan.Attributes().PutInt("http.status_code", int64(op.StatusCode))
	rootSpan.Attributes().PutStr("http.scheme", "http")
	rootSpan.Attributes().PutStr("http.host", "localhost:8080")
	rootSpan.Attributes().PutStr("net.peer.ip", "127.0.0.1")

	if !op.HasError {
		// Add validation span for POST/PUT
		if op.Method == "POST" || op.Method == "PUT" {
			validationSpan := ss.Spans().AppendEmpty()
			validationSpanID := pcommon.SpanID([8]byte{2, 0, 0, 0, 0, 0, 0, byte(index)})
			validationSpan.SetTraceID(traceID)
			validationSpan.SetSpanID(validationSpanID)
			validationSpan.SetParentSpanID(rootSpanID)
			validationSpan.SetName("validate_user_data")
			validationSpan.SetKind(ptrace.SpanKindInternal)
			validationSpan.SetStartTimestamp(pcommon.NewTimestampFromTime(startTime.Add(5 * time.Millisecond)))
			validationSpan.SetEndTimestamp(pcommon.NewTimestampFromTime(startTime.Add(15 * time.Millisecond)))
			validationSpan.Status().SetCode(ptrace.StatusCodeOk)
			validationSpan.Attributes().PutStr("validation.fields", "email,username,password")
		}

		// Database span
		dbSpan := ss.Spans().AppendEmpty()
		dbSpanID := pcommon.SpanID([8]byte{3, 0, 0, 0, 0, 0, 0, byte(index)})
		dbSpan.SetTraceID(traceID)
		dbSpan.SetSpanID(dbSpanID)
		dbSpan.SetParentSpanID(rootSpanID)
		dbSpan.SetName(getDatabaseOperation(op.Method))
		dbSpan.SetKind(ptrace.SpanKindClient)

		dbStart := startTime.Add(op.Duration / 3)
		dbEnd := now.Add(-10 * time.Millisecond)
		dbSpan.SetStartTimestamp(pcommon.NewTimestampFromTime(dbStart))
		dbSpan.SetEndTimestamp(pcommon.NewTimestampFromTime(dbEnd))
		dbSpan.Status().SetCode(ptrace.StatusCodeOk)
		dbSpan.Attributes().PutStr("db.system", "postgresql")
		dbSpan.Attributes().PutStr("db.name", "users_db")
		dbSpan.Attributes().PutStr("db.statement", getDatabaseStatement(op.Method, index))
		dbSpan.Attributes().PutStr("db.operation", getDatabaseOperation(op.Method))
		dbSpan.Attributes().PutStr("db.sql.table", "users")

		// Cache span for GET operations
		if op.Method == "GET" {
			cacheSpan := ss.Spans().AppendEmpty()
			cacheSpanID := pcommon.SpanID([8]byte{4, 0, 0, 0, 0, 0, 0, byte(index)})
			cacheSpan.SetTraceID(traceID)
			cacheSpan.SetSpanID(cacheSpanID)
			cacheSpan.SetParentSpanID(rootSpanID)
			cacheSpan.SetName("cache_lookup")
			cacheSpan.SetKind(ptrace.SpanKindClient)
			cacheSpan.SetStartTimestamp(pcommon.NewTimestampFromTime(startTime.Add(2 * time.Millisecond)))
			cacheSpan.SetEndTimestamp(pcommon.NewTimestampFromTime(startTime.Add(5 * time.Millisecond)))
			cacheSpan.Status().SetCode(ptrace.StatusCodeOk)
			cacheSpan.Attributes().PutStr("cache.system", "redis")
			cacheSpan.Attributes().PutStr("cache.key", fmt.Sprintf("user:%d", index))
			cacheSpan.Attributes().PutBool("cache.hit", index%3 == 0)
		}
	}

	// Add events to root span
	if !op.HasError {
		event := rootSpan.Events().AppendEmpty()
		event.SetName(getEventName(op.Method))
		event.SetTimestamp(pcommon.NewTimestampFromTime(startTime.Add(op.Duration / 2)))
		event.Attributes().PutStr("event.type", "info")
	}

	// Send via HTTP
	request := ptraceotlp.NewExportRequestFromTraces(traces)
	data, err := request.MarshalProto()
	if err != nil {
		return fmt.Errorf("failed to marshal traces: %w", err)
	}

	return sendHTTPRequest(endpoint+"/v1/traces", data)
}

func sendOperationLogs(ctx context.Context, endpoint string, traceID pcommon.TraceID, op Operation, index int) error {
	logs := plog.NewLogs()
	rl := logs.ResourceLogs().AppendEmpty()

	// Resource attributes
	rl.Resource().Attributes().PutStr("service.name", "user-api")
	rl.Resource().Attributes().PutStr("host.name", "api-server-01")

	sl := rl.ScopeLogs().AppendEmpty()
	sl.Scope().SetName("user-api-logger")

	now := time.Now()
	rootSpanID := pcommon.SpanID([8]byte{1, 0, 0, 0, 0, 0, 0, byte(index)})

	// Request received log
	lr1 := sl.LogRecords().AppendEmpty()
	lr1.SetTimestamp(pcommon.NewTimestampFromTime(now.Add(-op.Duration)))
	lr1.SetSeverityNumber(plog.SeverityNumberInfo)
	lr1.SetSeverityText("INFO")
	lr1.Body().SetStr(fmt.Sprintf("Received %s request for %s", op.Method, op.Path))
	lr1.SetTraceID(traceID)
	lr1.SetSpanID(rootSpanID)
	lr1.Attributes().PutStr("http.method", op.Method)
	lr1.Attributes().PutStr("http.path", op.Path)
	lr1.Attributes().PutStr("logger.name", "http.server")

	if !op.HasError {
		// Processing log
		lr2 := sl.LogRecords().AppendEmpty()
		lr2.SetTimestamp(pcommon.NewTimestampFromTime(now.Add(-op.Duration / 2)))
		lr2.SetSeverityNumber(plog.SeverityNumberInfo)
		lr2.SetSeverityText("INFO")
		lr2.Body().SetStr(getProcessingMessage(op.Method, index))
		lr2.SetTraceID(traceID)
		lr2.SetSpanID(rootSpanID)
		lr2.Attributes().PutStr("user.id", fmt.Sprintf("user-%d", index))
		lr2.Attributes().PutStr("logger.name", "business.logic")

		// Success log
		lr3 := sl.LogRecords().AppendEmpty()
		lr3.SetTimestamp(pcommon.NewTimestampFromTime(now))
		lr3.SetSeverityNumber(plog.SeverityNumberInfo)
		lr3.SetSeverityText("INFO")
		lr3.Body().SetStr(fmt.Sprintf("Successfully processed %s request - returned %d", op.Method, op.StatusCode))
		lr3.SetTraceID(traceID)
		lr3.SetSpanID(rootSpanID)
		lr3.Attributes().PutInt("http.status_code", int64(op.StatusCode))
		lr3.Attributes().PutInt("response.time_ms", int64(op.Duration.Milliseconds()))
		lr3.Attributes().PutStr("logger.name", "http.server")
	} else {
		// Error log
		lr2 := sl.LogRecords().AppendEmpty()
		lr2.SetTimestamp(pcommon.NewTimestampFromTime(now))
		lr2.SetSeverityNumber(plog.SeverityNumberError)
		lr2.SetSeverityText("ERROR")
		lr2.Body().SetStr(fmt.Sprintf("Request failed: %s", getErrorMessage(op)))
		lr2.SetTraceID(traceID)
		lr2.SetSpanID(rootSpanID)
		lr2.Attributes().PutInt("http.status_code", int64(op.StatusCode))
		lr2.Attributes().PutStr("error.type", getErrorType(op))
		lr2.Attributes().PutStr("logger.name", "http.server")
	}

	// Send via HTTP
	request := plogotlp.NewExportRequestFromLogs(logs)
	data, err := request.MarshalProto()
	if err != nil {
		return fmt.Errorf("failed to marshal logs: %w", err)
	}

	return sendHTTPRequest(endpoint+"/v1/logs", data)
}

func sendOperationMetrics(ctx context.Context, endpoint string, op Operation, index int) error {
	metrics := pmetric.NewMetrics()
	rm := metrics.ResourceMetrics().AppendEmpty()

	// Resource attributes
	rm.Resource().Attributes().PutStr("service.name", "user-api")
	rm.Resource().Attributes().PutStr("host.name", "api-server-01")

	sm := rm.ScopeMetrics().AppendEmpty()
	sm.Scope().SetName("user-api-metrics")

	now := time.Now()

	// Request count (counter)
	requestCount := sm.Metrics().AppendEmpty()
	requestCount.SetName("http.server.request.count")
	requestCount.SetUnit("requests")
	requestCount.SetEmptySum()
	requestCount.Sum().SetIsMonotonic(true)
	requestCount.Sum().SetAggregationTemporality(pmetric.AggregationTemporalityCumulative)

	dp1 := requestCount.Sum().DataPoints().AppendEmpty()
	dp1.SetTimestamp(pcommon.NewTimestampFromTime(now))
	dp1.SetIntValue(int64(index + 1))
	dp1.Attributes().PutStr("http.method", op.Method)
	dp1.Attributes().PutStr("http.route", op.Path)
	dp1.Attributes().PutInt("http.status_code", int64(op.StatusCode))

	// Duration histogram
	duration := sm.Metrics().AppendEmpty()
	duration.SetName("http.server.duration")
	duration.SetUnit("ms")
	duration.SetEmptyHistogram()

	dp2 := duration.Histogram().DataPoints().AppendEmpty()
	dp2.SetTimestamp(pcommon.NewTimestampFromTime(now))
	dp2.SetCount(1)
	dp2.SetSum(float64(op.Duration.Milliseconds()))
	dp2.ExplicitBounds().FromRaw([]float64{0, 10, 25, 50, 100, 250, 500, 1000})
	dp2.BucketCounts().FromRaw(getBucketCounts(op.Duration.Milliseconds()))
	dp2.Attributes().PutStr("http.method", op.Method)
	dp2.Attributes().PutStr("http.route", op.Path)

	// Error count (only if error)
	if op.HasError {
		errorCount := sm.Metrics().AppendEmpty()
		errorCount.SetName("http.server.error.count")
		errorCount.SetUnit("errors")
		errorCount.SetEmptySum()
		errorCount.Sum().SetIsMonotonic(true)
		errorCount.Sum().SetAggregationTemporality(pmetric.AggregationTemporalityCumulative)

		dp3 := errorCount.Sum().DataPoints().AppendEmpty()
		dp3.SetTimestamp(pcommon.NewTimestampFromTime(now))
		dp3.SetIntValue(1)
		dp3.Attributes().PutStr("http.method", op.Method)
		dp3.Attributes().PutInt("http.status_code", int64(op.StatusCode))
		dp3.Attributes().PutStr("error.type", getErrorType(op))
	}

	// Send via HTTP
	request := pmetricotlp.NewExportRequestFromMetrics(metrics)
	data, err := request.MarshalProto()
	if err != nil {
		return fmt.Errorf("failed to marshal metrics: %w", err)
	}

	return sendHTTPRequest(endpoint+"/v1/metrics", data)
}

// Helper functions
func getDatabaseOperation(method string) string {
	switch method {
	case "GET":
		return "SELECT"
	case "POST":
		return "INSERT"
	case "PUT":
		return "UPDATE"
	case "DELETE":
		return "DELETE"
	default:
		return "SELECT"
	}
}

func getDatabaseStatement(method string, index int) string {
	switch method {
	case "GET":
		return fmt.Sprintf("SELECT * FROM users WHERE id = %d", index)
	case "POST":
		return "INSERT INTO users (username, email, created_at) VALUES ($1, $2, $3)"
	case "PUT":
		return fmt.Sprintf("UPDATE users SET username = $1, email = $2 WHERE id = %d", index)
	case "DELETE":
		return fmt.Sprintf("DELETE FROM users WHERE id = %d", index)
	default:
		return "SELECT * FROM users"
	}
}

func getEventName(method string) string {
	switch method {
	case "GET":
		return "User retrieved"
	case "POST":
		return "User created"
	case "PUT":
		return "User updated"
	case "DELETE":
		return "User deleted"
	default:
		return "Request processed"
	}
}

func getProcessingMessage(method string, index int) string {
	switch method {
	case "GET":
		return fmt.Sprintf("Fetching user data for user ID %d from database", index)
	case "POST":
		return fmt.Sprintf("Creating new user with email user%d@example.com", index)
	case "PUT":
		return fmt.Sprintf("Updating user %d with new data", index)
	case "DELETE":
		return fmt.Sprintf("Removing user %d from database", index)
	default:
		return "Processing request"
	}
}

func getErrorMessage(op Operation) string {
	if op.StatusCode == 404 {
		return "User not found"
	}
	if op.StatusCode == 400 {
		return "Invalid request: missing required fields"
	}
	return "Internal server error"
}

func getErrorType(op Operation) string {
	if op.StatusCode == 404 {
		return "NotFoundError"
	}
	if op.StatusCode == 400 {
		return "ValidationError"
	}
	return "InternalError"
}

func getBucketCounts(durationMs int64) []uint64 {
	// Distribute into buckets: [0, 10, 25, 50, 100, 250, 500, 1000]
	buckets := make([]uint64, 9) // 8 boundaries + 1

	switch {
	case durationMs < 10:
		buckets[0] = 1
	case durationMs < 25:
		buckets[1] = 1
	case durationMs < 50:
		buckets[2] = 1
	case durationMs < 100:
		buckets[3] = 1
	case durationMs < 250:
		buckets[4] = 1
	case durationMs < 500:
		buckets[5] = 1
	case durationMs < 1000:
		buckets[6] = 1
	default:
		buckets[7] = 1
	}

	return buckets
}

func sendHTTPRequest(url string, data []byte) error {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("POST", url, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-protobuf")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}
