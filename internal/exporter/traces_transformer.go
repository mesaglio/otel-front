package exporter

import (
	"fmt"
	"time"

	"github.com/mesaglio/otel-front/internal/store"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

// TransformTraces converts OTLP traces to internal trace model
func TransformTraces(td ptrace.Traces) ([]*store.Trace, error) {
	traces := make(map[string]*store.Trace)
	allSpans := make(map[string][]store.Span)

	// Iterate through resource spans
	for i := 0; i < td.ResourceSpans().Len(); i++ {
		rs := td.ResourceSpans().At(i)
		resourceAttrs := attributesToMap(rs.Resource().Attributes())
		serviceName := extractServiceName(resourceAttrs)

		// Iterate through scope spans
		for j := 0; j < rs.ScopeSpans().Len(); j++ {
			ss := rs.ScopeSpans().At(j)

			// Iterate through spans
			for k := 0; k < ss.Spans().Len(); k++ {
				span := ss.Spans().At(k)
				traceID := span.TraceID().String()
				spanID := span.SpanID().String()

				// Convert span
				convertedSpan := store.Span{
					SpanID:        spanID,
					TraceID:       traceID,
					ServiceName:   serviceName,
					OperationName: span.Name(),
					SpanKind:      spanKindToString(span.Kind()),
					StartTime:     time.Unix(0, int64(span.StartTimestamp())),
					EndTime:       time.Unix(0, int64(span.EndTimestamp())),
					DurationMs:    int64(span.EndTimestamp()-span.StartTimestamp()) / 1e6,
					StatusCode:    int(span.Status().Code()),
					Attributes:    attributesToMap(span.Attributes()),
					Events:        convertEvents(span.Events()),
					Links:         convertLinks(span.Links()),
				}

				// Set parent span ID if exists
				if !span.ParentSpanID().IsEmpty() {
					parentID := span.ParentSpanID().String()
					convertedSpan.ParentSpanID = &parentID
				}

				// Set status message if exists
				if span.Status().Message() != "" {
					msg := span.Status().Message()
					convertedSpan.StatusMessage = &msg
				}

				// Add span to the trace's span list
				allSpans[traceID] = append(allSpans[traceID], convertedSpan)

				// Create or update trace
				if _, exists := traces[traceID]; !exists {
					traces[traceID] = &store.Trace{
						TraceID:       traceID,
						ServiceName:   serviceName,
						OperationName: span.Name(),
						StartTime:     convertedSpan.StartTime,
						EndTime:       convertedSpan.EndTime,
						DurationMs:    convertedSpan.DurationMs,
						SpanCount:     1,
						ErrorCount:    0,
						StatusCode:    convertedSpan.StatusCode,
						Attributes:    mergeAttributes(resourceAttrs, convertedSpan.Attributes),
					}
				} else {
					// Update trace timing and counts
					trace := traces[traceID]
					trace.SpanCount++

					// Update start/end times
					if convertedSpan.StartTime.Before(trace.StartTime) {
						trace.StartTime = convertedSpan.StartTime
					}
					if convertedSpan.EndTime.After(trace.EndTime) {
						trace.EndTime = convertedSpan.EndTime
						trace.DurationMs = trace.EndTime.Sub(trace.StartTime).Milliseconds()
					}

					// Count errors
					if convertedSpan.StatusCode == int(ptrace.StatusCodeError) {
						trace.ErrorCount++
					}
				}
			}
		}
	}

	// Attach spans to traces
	result := make([]*store.Trace, 0, len(traces))
	for traceID, trace := range traces {
		trace.Spans = allSpans[traceID]
		result = append(result, trace)
	}

	return result, nil
}

// convertEvents converts OTLP events to internal event model
func convertEvents(events ptrace.SpanEventSlice) []store.SpanEvent {
	if events.Len() == 0 {
		return nil
	}

	result := make([]store.SpanEvent, 0, events.Len())
	for i := 0; i < events.Len(); i++ {
		event := events.At(i)
		result = append(result, store.SpanEvent{
			Name:       event.Name(),
			Timestamp:  time.Unix(0, int64(event.Timestamp())),
			Attributes: attributesToMap(event.Attributes()),
		})
	}
	return result
}

// convertLinks converts OTLP links to internal link model
func convertLinks(links ptrace.SpanLinkSlice) []store.SpanLink {
	if links.Len() == 0 {
		return nil
	}

	result := make([]store.SpanLink, 0, links.Len())
	for i := 0; i < links.Len(); i++ {
		link := links.At(i)
		result = append(result, store.SpanLink{
			TraceID:    link.TraceID().String(),
			SpanID:     link.SpanID().String(),
			Attributes: attributesToMap(link.Attributes()),
		})
	}
	return result
}

// attributesToMap converts OTLP attributes to a map
func attributesToMap(attrs pcommon.Map) map[string]interface{} {
	if attrs.Len() == 0 {
		return nil
	}

	result := make(map[string]interface{}, attrs.Len())
	attrs.Range(func(k string, v pcommon.Value) bool {
		result[k] = valueToInterface(v)
		return true
	})
	return result
}

// valueToInterface converts OTLP value to Go interface
func valueToInterface(v pcommon.Value) interface{} {
	switch v.Type() {
	case pcommon.ValueTypeStr:
		return v.Str()
	case pcommon.ValueTypeInt:
		return v.Int()
	case pcommon.ValueTypeDouble:
		return v.Double()
	case pcommon.ValueTypeBool:
		return v.Bool()
	case pcommon.ValueTypeMap:
		return attributesToMap(v.Map())
	case pcommon.ValueTypeSlice:
		slice := v.Slice()
		result := make([]interface{}, 0, slice.Len())
		for i := 0; i < slice.Len(); i++ {
			result = append(result, valueToInterface(slice.At(i)))
		}
		return result
	case pcommon.ValueTypeBytes:
		return fmt.Sprintf("%x", v.Bytes().AsRaw())
	default:
		return nil
	}
}

// spanKindToString converts span kind to string
func spanKindToString(kind ptrace.SpanKind) string {
	switch kind {
	case ptrace.SpanKindInternal:
		return "internal"
	case ptrace.SpanKindServer:
		return "server"
	case ptrace.SpanKindClient:
		return "client"
	case ptrace.SpanKindProducer:
		return "producer"
	case ptrace.SpanKindConsumer:
		return "consumer"
	default:
		return "unspecified"
	}
}

// extractServiceName extracts service name from resource attributes
func extractServiceName(attrs map[string]interface{}) string {
	if name, ok := attrs["service.name"].(string); ok {
		return name
	}
	return "unknown"
}

// mergeAttributes merges two attribute maps
func mergeAttributes(m1, m2 map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range m1 {
		result[k] = v
	}
	for k, v := range m2 {
		result[k] = v
	}
	return result
}
