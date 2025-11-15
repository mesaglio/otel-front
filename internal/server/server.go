package server

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mesaglio/otel-front/internal/config"
	"github.com/mesaglio/otel-front/internal/server/middleware"
	"github.com/mesaglio/otel-front/internal/store"
	"go.uber.org/zap"
)

//go:embed static/*
var staticFiles embed.FS

// Server manages the HTTP server
type Server struct {
	config *config.Config
	store  *store.Store
	logger *zap.Logger
	router *gin.Engine
	server *http.Server
}

// NewServer creates a new HTTP server
func NewServer(cfg *config.Config, store *store.Store, logger *zap.Logger) (*Server, error) {
	// Set Gin mode
	if !cfg.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	// Setup router with all routes
	router := SetupRouter(store, logger)

	// Setup static file serving
	setupStaticFiles(router, logger)

	srv := &Server{
		config: cfg,
		store:  store,
		logger: logger,
		router: router,
	}

	// Create HTTP server with CORS middleware
	srv.server = &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.HTTPPort),
		Handler:      middleware.CORS()(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return srv, nil
}

// setupStaticFiles serves the embedded frontend files
func setupStaticFiles(router *gin.Engine, logger *zap.Logger) {
	// Try to serve embedded static files
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		logger.Warn("Failed to load embedded static files, will serve empty page", zap.Error(err))
		// Serve a placeholder if frontend is not built yet
		router.GET("/", func(c *gin.Context) {
			c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>OTEL Viewer</title>
					<style>
						body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
						code { background: #f4f4f4; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
						.status { padding: 10px; background: #e3f2fd; border-left: 4px solid #2196f3; margin: 20px 0; }
					</style>
				</head>
				<body>
					<h1>🔭 OTEL Viewer</h1>
					<div class="status">
						<strong>✅ Backend is running!</strong>
					</div>
					<h2>Frontend Not Built</h2>
					<p>The frontend needs to be built before it can be served. Run:</p>
					<pre><code>cd frontend && npm run build</code></pre>
					<p>Then restart the backend.</p>
					<h2>Available Endpoints</h2>
					<ul>
						<li><a href="/health">Health Check</a> - <code>GET /health</code></li>
						<li><a href="/api/traces?limit=5">API Traces</a> - <code>GET /api/traces</code></li>
						<li><a href="/api/logs?limit=5">API Logs</a> - <code>GET /api/logs</code></li>
						<li><a href="/api/metrics?limit=5">API Metrics</a> - <code>GET /api/metrics</code></li>
					</ul>
				</body>
				</html>
			`))
		})
		return
	}

	// Serve static assets (CSS, JS, images, etc.)
	router.GET("/assets/*filepath", func(c *gin.Context) {
		c.FileFromFS(c.Request.URL.Path, http.FS(staticFS))
	})

	// Serve index.html for root and all non-API routes (SPA support)
	router.NoRoute(func(c *gin.Context) {
		// Don't intercept API routes
		if len(c.Request.URL.Path) >= 4 && c.Request.URL.Path[:4] == "/api" {
			c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
			return
		}
		if c.Request.URL.Path == "/health" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Health endpoint not found"})
			return
		}

		// Serve index.html for all other routes (SPA client-side routing)
		c.FileFromFS("/", http.FS(staticFS))
	})
}

// Start starts the HTTP server
func (s *Server) Start(ctx context.Context) error {
	s.logger.Info("Starting HTTP server", zap.Int("port", s.config.Server.HTTPPort))

	// Start server in a goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	// Wait for context cancellation or error
	select {
	case <-ctx.Done():
		return s.Shutdown(context.Background())
	case err := <-errChan:
		return err
	}
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	s.logger.Info("Shutting down HTTP server...")

	// Shutdown HTTP server with timeout
	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := s.server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server shutdown failed: %w", err)
	}

	s.logger.Info("HTTP server stopped gracefully")
	return nil
}
