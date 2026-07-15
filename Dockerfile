# Stage 1: Build frontend
FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go binary
FROM golang:1.26-bookworm@sha256:1ecb7edf62a0408027bd5729dfd6b1b8766e578e8df93995b225dfd0944eb651 AS go-builder
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
