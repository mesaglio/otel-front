package receiver

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"

	"github.com/mesaglio/otel-front/internal/exporter"
	"github.com/mesaglio/otel-front/internal/store"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/plog/plogotlp"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/pmetric/pmetricotlp"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.opentelemetry.io/collector/pdata/ptrace/ptraceotlp"
	"go.uber.org/zap"
	"google.golang.org/grpc"
)

// OTLPReceiver receives OTLP data via HTTP and gRPC
type OTLPReceiver struct {
	httpPort     int
	grpcPort     int
	store        *store.Store
	logger       *zap.Logger
	httpServer   *http.Server
	grpcServer   *grpc.Server
}

// NewOTLPReceiver creates a new OTLP receiver
func NewOTLPReceiver(httpPort, grpcPort int, store *store.Store, logger *zap.Logger) *OTLPReceiver {
	return &OTLPReceiver{
		httpPort: httpPort,
		grpcPort: grpcPort,
		store:    store,
		logger:   logger,
	}
}

// Start starts the OTLP receiver
func (r *OTLPReceiver) Start(ctx context.Context) error {
	// Start HTTP server
	go func() {
		if err := r.startHTTPServer(ctx); err != nil {
			r.logger.Error("HTTP receiver failed", zap.Error(err))
		}
	}()

	// Start gRPC server
	go func() {
		if err := r.startGRPCServer(ctx); err != nil {
			r.logger.Error("gRPC receiver failed", zap.Error(err))
		}
	}()

	return nil
}

// Stop stops the OTLP receiver
func (r *OTLPReceiver) Stop(ctx context.Context) error {
	if r.httpServer != nil {
		r.httpServer.Shutdown(ctx)
	}
	if r.grpcServer != nil {
		r.grpcServer.GracefulStop()
	}
	return nil
}

// startHTTPServer starts the HTTP OTLP receiver
func (r *OTLPReceiver) startHTTPServer(ctx context.Context) error {
	mux := http.NewServeMux()

	// Register OTLP HTTP endpoints
	mux.HandleFunc("/v1/traces", r.handleHTTPTraces)
	mux.HandleFunc("/v1/logs", r.handleHTTPLogs)
	mux.HandleFunc("/v1/metrics", r.handleHTTPMetrics)

	r.httpServer = &http.Server{
		Addr:    fmt.Sprintf(":%d", r.httpPort),
		Handler: mux,
	}

	r.logger.Info("Starting OTLP HTTP receiver", zap.Int("port", r.httpPort))
	return r.httpServer.ListenAndServe()
}

// startGRPCServer starts the gRPC OTLP receiver
func (r *OTLPReceiver) startGRPCServer(ctx context.Context) error {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", r.grpcPort))
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	r.grpcServer = grpc.NewServer()

	// Register gRPC services
	ptraceotlp.RegisterGRPCServer(r.grpcServer, &traceService{receiver: r})
	plogotlp.RegisterGRPCServer(r.grpcServer, &logService{receiver: r})
	pmetricotlp.RegisterGRPCServer(r.grpcServer, &metricService{receiver: r})

	r.logger.Info("Starting OTLP gRPC receiver", zap.Int("port", r.grpcPort))
	return r.grpcServer.Serve(lis)
}

// handleHTTPTraces handles HTTP trace requests
func (r *OTLPReceiver) handleHTTPTraces(w http.ResponseWriter, req *http.Request) {
	body, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}
	defer req.Body.Close()

	// Unmarshal protobuf
	request := ptraceotlp.NewExportRequest()
	if err := request.UnmarshalProto(body); err != nil {
		http.Error(w, "failed to unmarshal protobuf", http.StatusBadRequest)
		r.logger.Error("Failed to unmarshal traces", zap.Error(err))
		return
	}

	// Process traces
	if err := r.processTraces(req.Context(), request.Traces()); err != nil {
		http.Error(w, "failed to process traces", http.StatusInternalServerError)
		r.logger.Error("Failed to process traces", zap.Error(err))
		return
	}

	// Send response
	response := ptraceotlp.NewExportResponse()
	responseBytes, _ := response.MarshalProto()
	w.Header().Set("Content-Type", "application/x-protobuf")
	w.Write(responseBytes)
}

// handleHTTPLogs handles HTTP log requests
func (r *OTLPReceiver) handleHTTPLogs(w http.ResponseWriter, req *http.Request) {
	body, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}
	defer req.Body.Close()

	// Unmarshal protobuf
	request := plogotlp.NewExportRequest()
	if err := request.UnmarshalProto(body); err != nil {
		http.Error(w, "failed to unmarshal protobuf", http.StatusBadRequest)
		r.logger.Error("Failed to unmarshal logs", zap.Error(err))
		return
	}

	// Process logs
	if err := r.processLogs(req.Context(), request.Logs()); err != nil {
		http.Error(w, "failed to process logs", http.StatusInternalServerError)
		r.logger.Error("Failed to process logs", zap.Error(err))
		return
	}

	// Send response
	response := plogotlp.NewExportResponse()
	responseBytes, _ := response.MarshalProto()
	w.Header().Set("Content-Type", "application/x-protobuf")
	w.Write(responseBytes)
}

// handleHTTPMetrics handles HTTP metric requests
func (r *OTLPReceiver) handleHTTPMetrics(w http.ResponseWriter, req *http.Request) {
	body, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}
	defer req.Body.Close()

	// Unmarshal protobuf
	request := pmetricotlp.NewExportRequest()
	if err := request.UnmarshalProto(body); err != nil {
		http.Error(w, "failed to unmarshal protobuf", http.StatusBadRequest)
		r.logger.Error("Failed to unmarshal metrics", zap.Error(err))
		return
	}

	// Process metrics
	if err := r.processMetrics(req.Context(), request.Metrics()); err != nil {
		http.Error(w, "failed to process metrics", http.StatusInternalServerError)
		r.logger.Error("Failed to process metrics", zap.Error(err))
		return
	}

	// Send response
	response := pmetricotlp.NewExportResponse()
	responseBytes, _ := response.MarshalProto()
	w.Header().Set("Content-Type", "application/x-protobuf")
	w.Write(responseBytes)
}

// processTraces transforms and stores traces
func (r *OTLPReceiver) processTraces(ctx context.Context, td ptrace.Traces) error {
	traces, err := exporter.TransformTraces(td)
	if err != nil {
		return err
	}

	for _, trace := range traces {
		if err := r.store.Traces.InsertTrace(ctx, trace); err != nil {
			return err
		}
	}

	r.logger.Debug("Stored traces", zap.Int("count", len(traces)))
	return nil
}

// processLogs transforms and stores logs
func (r *OTLPReceiver) processLogs(ctx context.Context, ld plog.Logs) error {
	logs, err := exporter.TransformLogs(ld)
	if err != nil {
		return err
	}

	for _, log := range logs {
		if err := r.store.Logs.InsertLog(ctx, log); err != nil {
			return err
		}
	}

	r.logger.Debug("Stored logs", zap.Int("count", len(logs)))
	return nil
}

// processMetrics transforms and stores metrics
func (r *OTLPReceiver) processMetrics(ctx context.Context, md pmetric.Metrics) error {
	metrics, err := exporter.TransformMetrics(md)
	if err != nil {
		return err
	}

	for _, metric := range metrics {
		if err := r.store.Metrics.InsertMetric(ctx, metric); err != nil {
			return err
		}
	}

	r.logger.Debug("Stored metrics", zap.Int("count", len(metrics)))
	return nil
}

// gRPC service implementations

type traceService struct {
	ptraceotlp.UnimplementedGRPCServer
	receiver *OTLPReceiver
}

func (s *traceService) Export(ctx context.Context, req ptraceotlp.ExportRequest) (ptraceotlp.ExportResponse, error) {
	err := s.receiver.processTraces(ctx, req.Traces())
	return ptraceotlp.NewExportResponse(), err
}

type logService struct {
	plogotlp.UnimplementedGRPCServer
	receiver *OTLPReceiver
}

func (s *logService) Export(ctx context.Context, req plogotlp.ExportRequest) (plogotlp.ExportResponse, error) {
	err := s.receiver.processLogs(ctx, req.Logs())
	return plogotlp.NewExportResponse(), err
}

type metricService struct {
	pmetricotlp.UnimplementedGRPCServer
	receiver *OTLPReceiver
}

func (s *metricService) Export(ctx context.Context, req pmetricotlp.ExportRequest) (pmetricotlp.ExportResponse, error) {
	err := s.receiver.processMetrics(ctx, req.Metrics())
	return pmetricotlp.NewExportResponse(), err
}
