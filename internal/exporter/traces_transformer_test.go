package exporter

import (
	"testing"
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

func TestTransformTracesToStore(t *testing.T) {
	// Create OTLP traces
	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	
	rs.Resource().Attributes().PutStr("service.name", "test-service")
	rs.Resource().Attributes().PutStr("service.version", "1.0.0")
	
	ss := rs.ScopeSpans().AppendEmpty()
	ss.Scope().SetName("test-instrumentation")
	
	// Create span
	span := ss.Spans().AppendEmpty()
	traceID := pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
	spanID := pcommon.SpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8})
	
	span.SetTraceID(traceID)
	span.SetSpanID(spanID)
	span.SetName("HTTP GET /api/test")
	span.SetKind(ptrace.SpanKindServer)
	span.SetStartTimestamp(pcommon.NewTimestampFromTime(time.Now().Add(-100 * time.Millisecond)))
	span.SetEndTimestamp(pcommon.NewTimestampFromTime(time.Now()))
	span.Status().SetCode(ptrace.StatusCodeOk)
	span.Attributes().PutStr("http.method", "GET")
	span.Attributes().PutInt("http.status_code", 200)
	
	// Transform to store format
	storeTraces, err := TransformTraces(traces)
	if err != nil {
		t.Fatalf("Failed to transform traces: %v", err)
	}
	
	// Verify
	if len(storeTraces) != 1 {
		t.Errorf("Expected 1 trace, got %d", len(storeTraces))
	}
	
	if len(storeTraces) > 0 {
		trace := storeTraces[0]
		
		if trace.TraceID != "0102030405060708090a0b0c0d0e0f10" {
			t.Errorf("Expected trace_id '0102030405060708090a0b0c0d0e0f10', got %s", trace.TraceID)
		}
		
		if trace.ServiceName != "test-service" {
			t.Errorf("Expected service 'test-service', got %s", trace.ServiceName)
		}
		
		if trace.OperationName != "HTTP GET /api/test" {
			t.Errorf("Expected operation 'HTTP GET /api/test', got %s", trace.OperationName)
		}
		
		if len(trace.Spans) != 1 {
			t.Errorf("Expected 1 span, got %d", len(trace.Spans))
		}
		
		if len(trace.Spans) > 0 {
			span := trace.Spans[0]
			if span.SpanID != "0102030405060708" {
				t.Errorf("Expected span_id '0102030405060708', got %s", span.SpanID)
			}
		}
	}
}

func TestTransformSpanWithEvent(t *testing.T) {
	traces := ptrace.NewTraces()
	rs := traces.ResourceSpans().AppendEmpty()
	rs.Resource().Attributes().PutStr("service.name", "test-service")
	
	ss := rs.ScopeSpans().AppendEmpty()
	span := ss.Spans().AppendEmpty()
	
	span.SetTraceID(pcommon.TraceID([16]byte{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}))
	span.SetSpanID(pcommon.SpanID([8]byte{1, 2, 3, 4, 5, 6, 7, 8}))
	span.SetName("Test operation")
	span.SetKind(ptrace.SpanKindServer)
	span.SetStartTimestamp(pcommon.NewTimestampFromTime(time.Now().Add(-100 * time.Millisecond)))
	span.SetEndTimestamp(pcommon.NewTimestampFromTime(time.Now()))
	
	// Add event
	event := span.Events().AppendEmpty()
	event.SetName("Processing started")
	event.SetTimestamp(pcommon.NewTimestampFromTime(time.Now().Add(-50 * time.Millisecond)))
	event.Attributes().PutStr("event.type", "info")
	
	// Transform
	storeTraces, err := TransformTraces(traces)
	if err != nil {
		t.Fatalf("Failed to transform traces: %v", err)
	}
	
	// Verify event was transformed
	if len(storeTraces) > 0 && len(storeTraces[0].Spans) > 0 {
		span := storeTraces[0].Spans[0]
		if len(span.Events) != 1 {
			t.Errorf("Expected 1 event, got %d", len(span.Events))
		}
		if len(span.Events) > 0 && span.Events[0].Name != "Processing started" {
			t.Errorf("Expected event name 'Processing started', got %s", span.Events[0].Name)
		}
	}
}

