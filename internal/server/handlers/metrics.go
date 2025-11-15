package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mesaglio/otel-front/internal/store"
	"go.uber.org/zap"
)

// MetricsHandler handles metrics-related HTTP requests
type MetricsHandler struct {
	store  *store.Store
	logger *zap.Logger
}

// NewMetricsHandler creates a new metrics handler
func NewMetricsHandler(store *store.Store, logger *zap.Logger) *MetricsHandler {
	return &MetricsHandler{
		store:  store,
		logger: logger,
	}
}

// GetMetrics returns a list of metrics
func (h *MetricsHandler) GetMetrics(c *gin.Context) {
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

	metrics, err := h.store.Metrics.GetMetrics(c.Request.Context(), filters)
	if err != nil {
		h.logger.Error("Failed to get metrics", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve metrics"})
		return
	}

	// Get total count without filters for accurate statistics
	totalCount, err := h.store.Metrics.GetMetricsCount(c.Request.Context())
	if err != nil {
		h.logger.Warn("Failed to get total metrics count", zap.Error(err))
		totalCount = int64(len(metrics)) // Fallback to current page count
	}

	c.JSON(http.StatusOK, gin.H{
		"metrics": metrics,
		"count":   len(metrics),
		"total":   totalCount,
	})
}

// GetMetricNames returns a list of unique metric names
func (h *MetricsHandler) GetMetricNames(c *gin.Context) {
	serviceName := c.Query("service")

	names, err := h.store.Metrics.GetMetricNames(c.Request.Context(), serviceName)
	if err != nil {
		h.logger.Error("Failed to get metric names", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve metric names"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"names": names,
		"count": len(names),
	})
}

// AggregateMetrics computes metric aggregations
func (h *MetricsHandler) AggregateMetrics(c *gin.Context) {
	var req store.AggregationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	results, err := h.store.Metrics.AggregateMetrics(c.Request.Context(), req)
	if err != nil {
		h.logger.Error("Failed to aggregate metrics", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to aggregate metrics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"count":   len(results),
	})
}

// GetServices returns a list of unique services
func (h *MetricsHandler) GetServices(c *gin.Context) {
	services, err := h.store.Traces.GetServices(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get services", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve services"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"services": services,
		"count":    len(services),
	})
}

