package server

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mesaglio/otel-front/internal/store"
	"go.uber.org/zap"
)

// handleHealth returns health status
func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().Unix(),
	})
}

// handleGetTraces returns a list of traces
func (s *Server) handleGetTraces(c *gin.Context) {
	filters := store.TraceFilters{
		ServiceName: c.Query("service"),
		HasErrors:   c.Query("errors") == "true",
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

	traces, err := s.store.Traces.GetTraces(c.Request.Context(), filters)
	if err != nil {
		s.logger.Error("Failed to get traces", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve traces"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"traces": traces,
		"count":  len(traces),
	})
}

// handleGetTraceByID returns a single trace with all spans
func (s *Server) handleGetTraceByID(c *gin.Context) {
	traceID := c.Param("id")

	trace, err := s.store.Traces.GetTraceByID(c.Request.Context(), traceID)
	if err != nil {
		s.logger.Error("Failed to get trace", zap.Error(err), zap.String("trace_id", traceID))
		c.JSON(http.StatusNotFound, gin.H{"error": "Trace not found"})
		return
	}

	c.JSON(http.StatusOK, trace)
}

// handleGetLogs returns a list of logs
func (s *Server) handleGetLogs(c *gin.Context) {
	filters := store.LogFilters{
		ServiceName: c.Query("service"),
		TraceID:     c.Query("trace_id"),
		SearchText:  c.Query("search"),
		Limit:       getIntQuery(c, "limit", 100),
		Offset:      getIntQuery(c, "offset", 0),
	}

	if severity := c.Query("severity"); severity != "" {
		if val, err := strconv.Atoi(severity); err == nil {
			filters.MinSeverity = val
		}
	}

	if startTime := c.Query("start_time"); startTime != "" {
		if t, err := time.Parse(time.RFC3339, startTime); err == nil {
			filters.StartTime = t
		}
	}

	if endTime := c.Query("end_time"); endTime != "" {
		if t, err := time.Parse(time.RFC3339, endTime); err == nil {
			filters.EndTime = t
		}
	}

	logs, err := s.store.Logs.GetLogs(c.Request.Context(), filters)
	if err != nil {
		s.logger.Error("Failed to get logs", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve logs"})
		return
	}

	// Get total count for pagination
	total, _ := s.store.Logs.CountLogs(c.Request.Context(), filters)

	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"count": len(logs),
		"total": total,
	})
}

// handleGetLogsByTraceID returns logs associated with a trace
func (s *Server) handleGetLogsByTraceID(c *gin.Context) {
	traceID := c.Param("traceId")

	logs, err := s.store.Logs.GetLogsByTraceID(c.Request.Context(), traceID)
	if err != nil {
		s.logger.Error("Failed to get logs by trace ID", zap.Error(err), zap.String("trace_id", traceID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"count": len(logs),
	})
}

// handleGetMetrics returns a list of metrics
func (s *Server) handleGetMetrics(c *gin.Context) {
	filters := store.MetricFilters{
		MetricName:  c.Query("name"),
		MetricType:  c.Query("type"),
		ServiceName: c.Query("service"),
		Limit:       getIntQuery(c, "limit", 1000),
		Offset:      getIntQuery(c, "offset", 0),
	}

	if startTime := c.Query("start_time"); startTime != "" {
		if t, err := time.Parse(time.RFC3339, startTime); err == nil {
			filters.StartTime = t
		}
	}

	if endTime := c.Query("end_time"); endTime != "" {
		if t, err := time.Parse(time.RFC3339, endTime); err == nil {
			filters.EndTime = t
		}
	}

	metrics, err := s.store.Metrics.GetMetrics(c.Request.Context(), filters)
	if err != nil {
		s.logger.Error("Failed to get metrics", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve metrics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"metrics": metrics,
		"count":   len(metrics),
	})
}

// handleGetMetricNames returns a list of unique metric names
func (s *Server) handleGetMetricNames(c *gin.Context) {
	serviceName := c.Query("service")

	names, err := s.store.Metrics.GetMetricNames(c.Request.Context(), serviceName)
	if err != nil {
		s.logger.Error("Failed to get metric names", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve metric names"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"names": names,
		"count": len(names),
	})
}

// handleAggregateMetrics computes metric aggregations
func (s *Server) handleAggregateMetrics(c *gin.Context) {
	var req store.AggregationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	results, err := s.store.Metrics.AggregateMetrics(c.Request.Context(), req)
	if err != nil {
		s.logger.Error("Failed to aggregate metrics", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate metrics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"count":   len(results),
	})
}

// handleGetServices returns a list of unique services
func (s *Server) handleGetServices(c *gin.Context) {
	services, err := s.store.Traces.GetServices(c.Request.Context())
	if err != nil {
		s.logger.Error("Failed to get services", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve services"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"services": services,
		"count":    len(services),
	})
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
