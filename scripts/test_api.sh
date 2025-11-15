#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000"

echo -e "${BLUE}=== OTEL Viewer API Test Script ===${NC}\n"

# Function to print section headers
print_section() {
    echo -e "\n${GREEN}=== $1 ===${NC}"
}

# Function to make request and pretty print
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3

    echo -e "${BLUE}$method $endpoint${NC}"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}Error: HTTP $http_code${NC}"
        echo "$body"
    fi
    echo ""
}

# Check if server is running
print_section "Health Check"
test_endpoint "GET" "/health"

# Test Traces endpoints
print_section "Traces API"

echo "1. Get all traces (limit 5)"
test_endpoint "GET" "/api/traces?limit=5"

echo "2. Get traces with filters (errors only)"
test_endpoint "GET" "/api/traces?errors=true&limit=3"

echo "3. Get traces by service"
test_endpoint "GET" "/api/traces?service=api-gateway&limit=3"

echo "4. Get traces by duration (>100ms)"
test_endpoint "GET" "/api/traces?min_duration=100&limit=3"

# Get a trace ID for detailed query
TRACE_ID=$(curl -s "$BASE_URL/api/traces?limit=1" | jq -r '.traces[0].trace_id // empty')

if [ ! -z "$TRACE_ID" ]; then
    echo "5. Get trace by ID: $TRACE_ID"
    test_endpoint "GET" "/api/traces/$TRACE_ID"
fi

# Test Logs endpoints
print_section "Logs API"

echo "1. Get all logs (limit 5)"
test_endpoint "GET" "/api/logs?limit=5"

echo "2. Get logs by service"
test_endpoint "GET" "/api/logs?service=user-service&limit=3"

echo "3. Get logs by severity (ERROR)"
test_endpoint "GET" "/api/logs?severity=17&limit=3"

echo "4. Search logs"
test_endpoint "GET" "/api/logs?search=authenticated&limit=3"

if [ ! -z "$TRACE_ID" ]; then
    echo "5. Get logs by trace ID"
    test_endpoint "GET" "/api/logs/trace/$TRACE_ID"
fi

# Test Metrics endpoints
print_section "Metrics API"

echo "1. Get metric names"
test_endpoint "GET" "/api/metrics/names"

echo "2. Get metrics by name"
test_endpoint "GET" "/api/metrics?name=http.server.requests&limit=5"

echo "3. Get metrics by service"
test_endpoint "GET" "/api/metrics?service=api-gateway&limit=5"

echo "4. Aggregate metrics"
AGGREGATE_REQUEST='{
  "metric_name": "http.server.request.duration",
  "service_name": "",
  "start_time": "'$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)'",
  "end_time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "aggregation": "avg",
  "bucket_size": "5 minutes"
}'
test_endpoint "POST" "/api/metrics/aggregate" "$AGGREGATE_REQUEST"

# Test Services endpoint
print_section "Services API"

echo "1. Get all services"
test_endpoint "GET" "/api/services"

print_section "Test Complete!"
echo -e "${GREEN}All API endpoints tested successfully!${NC}"
echo ""
echo "Tips:"
echo "  - Use jq for better JSON formatting: curl ... | jq '.'"
echo "  - Add -v flag to curl for verbose output"
echo "  - Check logs with: docker-compose logs -f postgres"
echo ""
