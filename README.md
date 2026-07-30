# OTEL Viewer

> **Archived:** Development of this repository has ended. We are collaborating with [otel-desktop-viewer](https://github.com/CtrlSpice/otel-desktop-viewer) on the continued development of an OpenTelemetry desktop viewer.

A lightweight, single-binary OpenTelemetry viewer for local development. Visualize traces, logs, and metrics from your instrumented applications — no Docker, no databases, no complex setup.

![Dashboard](docs/dashboard.png)

## Installation

### Homebrew (macOS & Linux)

```bash
brew tap mesaglio/otel-front
brew install otel-front
```

### Docker

```bash
docker run -p 8000:8000 -p 4317:4317 -p 4318:4318 ghcr.io/mesaglio/otel-front:latest
docker run -P ghcr.io/mesaglio/otel-front:latest
```

### Pre-built binary

Download from **[Releases](https://github.com/mesaglio/otel-front/releases/latest)** (macOS and Linux, x86_64 & ARM64):

```bash
tar -xzf otel-front_*.tar.gz
./otel-front
```

### Build from source

Requires Go 1.24+ and Node.js 22+.

```bash
git clone https://github.com/mesaglio/otel-front
cd otel-front
make release
./bin/otel-front
```

## Quick Start

```bash
otel-front
```

Opens `http://localhost:8000` automatically. Point your app's OTLP exporter at:

| Protocol | Endpoint                |
| -------- | ----------------------- |
| HTTP     | `http://localhost:4318` |
| gRPC     | `localhost:4317`        |

```bash
# HTTP
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_LOGS_EXPORTER="otlp"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"

# gRPC
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"
export OTEL_EXPORTER_OTLP_PROTOCOL="grpc"
export OTEL_LOGS_EXPORTER="otlp"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
```

The UI includes a copy-paste helper for these variables.

## Features

- **Traces** — waterfall view, flame graph, side-by-side comparison, search by operation/trace ID
- **Logs** — full-text search, severity/service filters, correlation with traces via `trace_id`
- **Metrics** — query builder, time series charts, aggregations (avg, sum, min, max, count)
- **Single binary** with embedded frontend and in-memory DuckDB — no external dependencies

![Traces](docs/traces.png)
![Trace Comparison](docs/traces_comparation.png)
![Correlated Logs](docs/traces_correlated.png)
![Logs](docs/logs.png)
![Metrics](docs/metrics.png)

## CLI Options

```
--port             HTTP server port (default: 8000)
--otlp-http-port   OTLP HTTP receiver port (default: 4318)
--otlp-grpc-port   OTLP gRPC receiver port (default: 4317)
--debug            Enable debug logging
--no-browser       Don't open browser automatically
--version          Show version information
```

## Development

```bash
# Backend (with live reload)
go run cmd/viewer/main.go --debug

# Frontend dev server (proxies API to backend)
cd frontend && npm install && npm run dev

# Send test data
go run scripts/send_otlp_data.go --count 20
```

## Contributing

PRs welcome. Run `make test` before submitting.

## License

MIT — inspired by [otel-desktop-viewer](https://github.com/CtrlSpice/otel-desktop-viewer).
