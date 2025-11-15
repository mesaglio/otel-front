package config

// Config holds the application configuration
type Config struct {
	Server ServerConfig
	Debug  bool
}

// ServerConfig holds server configuration
type ServerConfig struct {
	HTTPPort     int // Port for HTTP API and WebSocket
	OTLPHTTPPort int // Port for OTLP HTTP receiver
	OTLPGRPCPort int // Port for OTLP gRPC receiver
}
