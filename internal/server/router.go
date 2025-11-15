package server

import (
	"github.com/gin-gonic/gin"
	"github.com/mesaglio/otel-front/internal/server/handlers"
	"github.com/mesaglio/otel-front/internal/server/middleware"
	"github.com/mesaglio/otel-front/internal/store"
	"go.uber.org/zap"
)

// SetupRouter configures all HTTP routes
func SetupRouter(store *store.Store, logger *zap.Logger) *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(logger))

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler()
	tracesHandler := handlers.NewTracesHandler(store, logger)
	logsHandler := handlers.NewLogsHandler(store, logger)
	metricsHandler := handlers.NewMetricsHandler(store, logger)

	// Health check
	router.GET("/health", healthHandler.HandleHealth)

	// API routes
	api := router.Group("/api")
	{
		// Traces
		api.GET("/traces", tracesHandler.GetTraces)
		api.GET("/traces/:id", tracesHandler.GetTraceByID)
		api.POST("/traces/compare", tracesHandler.CompareTraces)

		// Logs
		api.GET("/logs", logsHandler.GetLogs)
		api.GET("/logs/trace/:traceId", logsHandler.GetLogsByTraceID)

		// Metrics
		api.GET("/metrics", metricsHandler.GetMetrics)
		api.GET("/metrics/names", metricsHandler.GetMetricNames)
		api.POST("/metrics/aggregate", metricsHandler.AggregateMetrics)

		// Services
		api.GET("/services", metricsHandler.GetServices)
	}

	return router
}

