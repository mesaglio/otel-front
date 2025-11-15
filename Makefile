.PHONY: help dev build run test test-backend test-frontend test-coverage clean frontend-dev frontend-build release send-otlp

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Backend commands
dev: ## Run backend in development mode (DuckDB in-memory)
	go run cmd/viewer/main.go --debug

build: frontend-build ## Build production binary (includes frontend)
	go build -o bin/otel-front cmd/viewer/main.go

run: build ## Run production binary
	./bin/otel-front

test: ## Run all tests (backend + frontend)
	@echo "Running backend tests..."
	@go test ./... -v
	@echo ""
	@echo "Running frontend tests..."
	@cd frontend && npm test run

test-backend: ## Run only backend tests
	go test ./... -v

test-frontend: ## Run only frontend tests
	cd frontend && npm test run

test-coverage: ## Run tests with coverage
	@echo "Backend coverage..."
	@go test ./... -cover
	@echo ""
	@echo "Frontend coverage..."
	@cd frontend && npm run test:coverage

send-otlp: ## Send test OTLP data (requires server running)
	go run scripts/send_otlp_data.go --count 20

# Frontend commands
frontend-install: ## Install frontend dependencies
	cd frontend && npm install

frontend-dev: ## Run frontend in development mode
	cd frontend && npm run dev

frontend-build: frontend-install ## Build frontend for production
	cd frontend && npm run build

# Cleanup
clean: ## Clean build artifacts
	rm -rf bin/
	rm -rf internal/server/static/
	rm -f coverage.out
	rm -f /tmp/otel-*.log

# Release commands
release: clean frontend-build ## Build binary for current platform
	@echo "Building release for current platform..."
	@mkdir -p bin
	CGO_ENABLED=1 go build -o bin/otel-front cmd/viewer/main.go
	@echo "✅ Release build complete in bin/"
	@ls -lh bin/

release-snapshot: frontend-build ## Run GoReleaser with snapshot flag
	@echo "Running GoReleaser"
	@goreleaser release --snapshot --clean --skip=publish
	@echo "✅ Snapshot complete in dist/"
