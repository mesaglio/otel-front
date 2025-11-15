package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mesaglio/otel-front/internal/store"
	"go.uber.org/zap"
)

// TracesHandler handles trace-related HTTP requests
type TracesHandler struct {
	store  *store.Store
	logger *zap.Logger
}

// NewTracesHandler creates a new traces handler
func NewTracesHandler(store *store.Store, logger *zap.Logger) *TracesHandler {
	return &TracesHandler{
		store:  store,
		logger: logger,
	}
}

// GetTraces returns a list of traces
func (h *TracesHandler) GetTraces(c *gin.Context) {
	filters := store.TraceFilters{
		ServiceName: c.Query("service"),
		HasErrors:   c.Query("errors") == "true",
		Search:      c.Query("search"),
		Limit:       getIntQuery(c, "limit", 100),
		Offset:      getIntQuery(c, "offset", 0),
	}

	if minDuration := c.Query("min_duration"); minDuration != "" {
		if val, err := strconv.ParseInt(minDuration, 10, 64); err == nil {
			filters.MinDuration = val
		}
	}

	if maxDuration := c.Query("max_duration"); maxDuration != "" {
		if val, err := strconv.ParseInt(maxDuration, 10, 64); err == nil {
			filters.MaxDuration = val
		}
	}

	traces, err := h.store.Traces.GetTraces(c.Request.Context(), filters)
	if err != nil {
		h.logger.Error("Failed to get traces", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve traces"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"traces": traces,
		"count":  len(traces),
	})
}

// GetTraceByID returns a single trace with all spans
func (h *TracesHandler) GetTraceByID(c *gin.Context) {
	traceID := c.Param("id")

	trace, err := h.store.Traces.GetTraceByID(c.Request.Context(), traceID)
	if err != nil {
		h.logger.Error("Failed to get trace", zap.Error(err), zap.String("trace_id", traceID))
		c.JSON(http.StatusNotFound, gin.H{"error": "Trace not found"})
		return
	}

	c.JSON(http.StatusOK, trace)
}

// CompareTracesRequest represents a request to compare traces
type CompareTracesRequest struct {
	TraceIDs []string `json:"trace_ids" binding:"required,min=2,max=4"`
}

// CompareTraces compares two or more traces side by side
func (h *TracesHandler) CompareTraces(c *gin.Context) {
	var req CompareTracesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body. Must provide 2-4 trace_ids"})
		return
	}

	if len(req.TraceIDs) < 2 || len(req.TraceIDs) > 4 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Must provide between 2 and 4 trace_ids"})
		return
	}

	// Fetch all traces
	traces := make([]*store.Trace, 0, len(req.TraceIDs))
	for _, traceID := range req.TraceIDs {
		trace, err := h.store.Traces.GetTraceByID(c.Request.Context(), traceID)
		if err != nil {
			h.logger.Warn("Failed to get trace for comparison", zap.Error(err), zap.String("trace_id", traceID))
			c.JSON(http.StatusNotFound, gin.H{"error": "One or more traces not found", "trace_id": traceID})
			return
		}
		traces = append(traces, trace)
	}

	// Calculate comparison statistics
	comparison := h.compareTracesStats(traces)

	c.JSON(http.StatusOK, gin.H{
		"traces":     traces,
		"comparison": comparison,
	})
}

// compareTracesStats calculates comparison statistics between traces
func (h *TracesHandler) compareTracesStats(traces []*store.Trace) map[string]interface{} {
	if len(traces) == 0 {
		return nil
	}

	// Find min/max durations
	minDuration := traces[0].DurationMs
	maxDuration := traces[0].DurationMs
	totalDuration := int64(0)

	// Find min/max span counts
	minSpans := traces[0].SpanCount
	maxSpans := traces[0].SpanCount
	totalSpans := 0

	// Count errors
	totalErrors := 0

	for _, trace := range traces {
		if trace.DurationMs < minDuration {
			minDuration = trace.DurationMs
		}
		if trace.DurationMs > maxDuration {
			maxDuration = trace.DurationMs
		}
		totalDuration += trace.DurationMs

		if trace.SpanCount < minSpans {
			minSpans = trace.SpanCount
		}
		if trace.SpanCount > maxSpans {
			maxSpans = trace.SpanCount
		}
		totalSpans += trace.SpanCount

		totalErrors += trace.ErrorCount
	}

	avgDuration := totalDuration / int64(len(traces))
	avgSpans := float64(totalSpans) / float64(len(traces))

	return map[string]interface{}{
		"count":           len(traces),
		"duration_ms": map[string]interface{}{
			"min": minDuration,
			"max": maxDuration,
			"avg": avgDuration,
		},
		"span_count": map[string]interface{}{
			"min": minSpans,
			"max": maxSpans,
			"avg": avgSpans,
		},
		"total_errors": totalErrors,
	}
}

// Helper function to get int query parameter with default
func getIntQuery(c *gin.Context, key string, defaultVal int) int {
	if val := c.Query(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}

