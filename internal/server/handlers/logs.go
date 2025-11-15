package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mesaglio/otel-front/internal/store"
	"go.uber.org/zap"
)

// LogsHandler handles log-related HTTP requests
type LogsHandler struct {
	store  *store.Store
	logger *zap.Logger
}

// NewLogsHandler creates a new logs handler
func NewLogsHandler(store *store.Store, logger *zap.Logger) *LogsHandler {
	return &LogsHandler{
		store:  store,
		logger: logger,
	}
}

// GetLogs returns a list of logs
func (h *LogsHandler) GetLogs(c *gin.Context) {
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

	logs, err := h.store.Logs.GetLogs(c.Request.Context(), filters)
	if err != nil {
		h.logger.Error("Failed to get logs", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve logs"})
		return
	}

	// Get total count for pagination
	total, _ := h.store.Logs.CountLogs(c.Request.Context(), filters)

	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"count": len(logs),
		"total": total,
	})
}

// GetLogsByTraceID returns logs associated with a trace
func (h *LogsHandler) GetLogsByTraceID(c *gin.Context) {
	traceID := c.Param("traceId")

	logs, err := h.store.Logs.GetLogsByTraceID(c.Request.Context(), traceID)
	if err != nil {
		h.logger.Error("Failed to get logs by trace ID", zap.Error(err), zap.String("trace_id", traceID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"count": len(logs),
	})
}

