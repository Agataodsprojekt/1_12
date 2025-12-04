#!/bin/bash
# Script to run all services locally (for development)

echo "🚀 Starting all IFC Construction Calculator services..."

# Start PostgreSQL (if not running)
echo "📦 Starting PostgreSQL..."
docker-compose up -d postgres

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
sleep 5

# Start services in background
echo "🔧 Starting API Gateway..."
cd api-gateway && python main.py &
GATEWAY_PID=$!

echo "🔧 Starting IFC Parser Service..."
cd ../ifc-parser-service && python main.py &
IFC_PARSER_PID=$!

echo "🔧 Starting Calculation Engine..."
cd ../calculation-engine-service && python main.py &
CALC_PID=$!

echo "🔧 Starting Cost Calculator..."
cd ../cost-calculator-service && python main.py &
COST_PID=$!

echo "🔧 Starting 3D Data Service..."
cd ../3d-data-service && python main.py &
VIZ_PID=$!

echo "🔧 Starting Database Manager..."
cd ../database-manager-service && python main.py &
DB_PID=$!

echo ""
echo "✅ All services started!"
echo ""
echo "Services:"
echo "  - API Gateway: http://localhost:8000"
echo "  - IFC Parser: http://localhost:5001"
echo "  - Calculation Engine: http://localhost:5002"
echo "  - Cost Calculator: http://localhost:5003"
echo "  - 3D Data: http://localhost:5004"
echo "  - Database Manager: http://localhost:5005"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all processes
wait

