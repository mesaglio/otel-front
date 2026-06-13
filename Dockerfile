# Stage 1: Build frontend
FROM node:24-alpine@sha256:fb71d01345f11b708a3553c66e7c74074f2d506400ea81973343d915cb64eef0 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go binary
FROM golang:1.26-bookworm@sha256:5f68ec6805843bd3981a951ffada82a26a0bd2631045c8f7dba483fa868f5ec5 AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend-builder /app/internal/server/static/ ./internal/server/static/
RUN CGO_ENABLED=1 go build -trimpath \
    -ldflags="-s -w" \
    -o otel-front \
    ./cmd/viewer/main.go

# Stage 3: Distroless runtime (includes glibc + libstdc++ required by DuckDB/CGO)
FROM gcr.io/distroless/cc-debian12
COPY --from=go-builder /app/otel-front /usr/local/bin/otel-front
EXPOSE 8000 4317 4318
ENTRYPOINT ["/usr/local/bin/otel-front"]
CMD ["--no-browser"]
