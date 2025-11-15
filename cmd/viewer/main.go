package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/mesaglio/otel-front/internal/config"
	"github.com/mesaglio/otel-front/internal/receiver"
	"github.com/mesaglio/otel-front/internal/server"
	"github.com/mesaglio/otel-front/internal/store"
	"go.uber.org/zap"
)

var (
	// Version information - set by GoReleaser at build time
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func main() {
	// Parse command line flags
	var (
		httpPort     = flag.Int("port", 8000, "HTTP server port")
		otlpHTTPPort = flag.Int("otlp-http-port", 4318, "OTLP HTTP receiver port")
		otlpGRPCPort = flag.Int("otlp-grpc-port", 4317, "OTLP gRPC receiver port")
		debug        = flag.Bool("debug", false, "Enable debug logging")
		noBrowser    = flag.Bool("no-browser", false, "Don't open browser automatically")
		showVersion  = flag.Bool("version", false, "Show version information and exit")
	)
	flag.Parse()

	// Show version and exit if requested
	if *showVersion {
		fmt.Printf("otel-front version %s\n", version)
		fmt.Printf("  commit: %s\n", commit)
		fmt.Printf("  built: %s\n", date)
		fmt.Printf("  go: %s\n", runtime.Version())
		fmt.Printf("  platform: %s/%s\n", runtime.GOOS, runtime.GOARCH)
		return
	}

	// Initialize logger
	var logger *zap.Logger
	var err error
	if *debug {
		logger, err = zap.NewDevelopment()
	} else {
		logger, err = zap.NewProduction()
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	// Load configuration
	cfg := &config.Config{
		Server: config.ServerConfig{
			HTTPPort:     *httpPort,
			OTLPHTTPPort: *otlpHTTPPort,
			OTLPGRPCPort: *otlpGRPCPort,
		},
		Debug: *debug,
	}

	logger.Info("Starting OTEL Viewer",
		zap.String("version", version),
		zap.String("commit", commit),
		zap.Int("http_port", cfg.Server.HTTPPort),
		zap.Int("otlp_http_port", cfg.Server.OTLPHTTPPort),
		zap.Int("otlp_grpc_port", cfg.Server.OTLPGRPCPort),
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize database store (DuckDB in-memory)
	logger.Info("Initializing DuckDB in-memory database...")
	dataStore, err := store.NewStore(ctx, logger)
	if err != nil {
		logger.Fatal("Failed to initialize store", zap.Error(err))
	}
	defer dataStore.Close()

	logger.Info("Running database migrations...")
	if err := dataStore.Migrate(ctx); err != nil {
		logger.Fatal("Failed to run migrations", zap.Error(err))
	}

	// Initialize OTLP receiver
	logger.Info("Starting OTLP receiver...")
	otlpReceiver := receiver.NewOTLPReceiver(cfg.Server.OTLPHTTPPort, cfg.Server.OTLPGRPCPort, dataStore, logger)
	if err := otlpReceiver.Start(ctx); err != nil {
		logger.Fatal("Failed to start OTLP receiver", zap.Error(err))
	}

	// Initialize HTTP server
	logger.Info("Starting HTTP server...")
	srv, err := server.NewServer(cfg, dataStore, logger)
	if err != nil {
		logger.Fatal("Failed to create server", zap.Error(err))
	}

	// Start server in background
	errChan := make(chan error, 1)
	go func() {
		if err := srv.Start(ctx); err != nil {
			errChan <- err
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	url := fmt.Sprintf("http://localhost:%d", cfg.Server.HTTPPort)
	logger.Info("OTEL Viewer is running",
		zap.String("url", url),
	)
	logger.Info("Send OTLP data to:",
		zap.String("http", fmt.Sprintf("http://localhost:%d", cfg.Server.OTLPHTTPPort)),
		zap.String("grpc", fmt.Sprintf("localhost:%d", cfg.Server.OTLPGRPCPort)),
	)

	// Open browser automatically (unless disabled)
	if !*noBrowser {
		go func() {
			// Wait a bit for server to be ready
			time.Sleep(500 * time.Millisecond)
			if err := openBrowser(url); err != nil {
				logger.Warn("Failed to open browser", zap.Error(err))
			} else {
				logger.Info("Browser opened", zap.String("url", url))
			}
		}()
	}

	// Block until we receive a signal or error
	select {
	case err := <-errChan:
		logger.Error("Server error", zap.Error(err))
		os.Exit(1)
	case sig := <-sigChan:
		logger.Info("Received signal, shutting down...", zap.String("signal", sig.String()))
	}

	// Graceful shutdown
	logger.Info("Shutting down server...")
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("Error during shutdown", zap.Error(err))
	}
	if err := otlpReceiver.Stop(ctx); err != nil {
		logger.Error("Error stopping OTLP receiver", zap.Error(err))
	}
	logger.Info("Server stopped")
}

// openBrowser opens the specified URL in the default browser
func openBrowser(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "darwin": // macOS
		cmd = "open"
		args = []string{url}
	case "linux":
		cmd = "xdg-open"
		args = []string{url}
	case "windows":
		cmd = "rundll32"
		args = []string{"url.dll,FileProtocolHandler", url}
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	return exec.Command(cmd, args...).Start()
}
