package exporter

import (
	"fmt"
	"time"

	"github.com/mesaglio/otel-front/internal/store"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
)

// TransformLogs converts OTLP logs to internal log model
func TransformLogs(ld plog.Logs) ([]*store.LogRecord, error) {
	logs := make([]*store.LogRecord, 0)

	// Iterate through resource logs
	for i := 0; i < ld.ResourceLogs().Len(); i++ {
		rl := ld.ResourceLogs().At(i)
		resourceAttrs := attributesToMap(rl.Resource().Attributes())
		serviceName := extractServiceName(resourceAttrs)

		// Iterate through scope logs
		for j := 0; j < rl.ScopeLogs().Len(); j++ {
			sl := rl.ScopeLogs().At(j)

			// Iterate through log records
			for k := 0; k < sl.LogRecords().Len(); k++ {
				lr := sl.LogRecords().At(k)

				log := &store.LogRecord{
					Timestamp:          time.Unix(0, int64(lr.Timestamp())),
					SeverityText:       lr.SeverityText(),
					SeverityNumber:     int(lr.SeverityNumber()),
					Body:               logBodyToString(lr.Body()),
					ServiceName:        serviceName,
					Attributes:         attributesToMap(lr.Attributes()),
					ResourceAttributes: resourceAttrs,
				}

				// Extract trace and span IDs if present
				if !lr.TraceID().IsEmpty() {
					traceID := lr.TraceID().String()
					log.TraceID = &traceID
				}
				if !lr.SpanID().IsEmpty() {
					spanID := lr.SpanID().String()
					log.SpanID = &spanID
				}

				logs = append(logs, log)
			}
		}
	}

	return logs, nil
}

// logBodyToString converts log body to string
func logBodyToString(body pcommon.Value) string {
	switch body.Type() {
	case pcommon.ValueTypeStr:
		return body.Str()
	case pcommon.ValueTypeInt:
		return fmt.Sprintf("%d", body.Int())
	case pcommon.ValueTypeDouble:
		return fmt.Sprintf("%f", body.Double())
	case pcommon.ValueTypeBool:
		return fmt.Sprintf("%t", body.Bool())
	case pcommon.ValueTypeMap:
		// Convert map to JSON-like string
		attrs := attributesToMap(body.Map())
		return fmt.Sprintf("%v", attrs)
	case pcommon.ValueTypeSlice:
		slice := body.Slice()
		result := "["
		for i := 0; i < slice.Len(); i++ {
			if i > 0 {
				result += ", "
			}
			result += logBodyToString(slice.At(i))
		}
		result += "]"
		return result
	case pcommon.ValueTypeBytes:
		return fmt.Sprintf("%x", body.Bytes().AsRaw())
	default:
		return ""
	}
}
