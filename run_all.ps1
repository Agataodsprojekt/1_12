# PowerShell script to run all services locally (Windows)

Write-Host "🚀 Starting all IFC Construction Calculator services..." -ForegroundColor Green

# Start PostgreSQL
Write-Host "📦 Starting PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d postgres

# Wait for PostgreSQL
Write-Host "⏳ Waiting for PostgreSQL..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start services in separate windows
Write-Host "🔧 Starting services in separate PowerShell windows..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd api-gateway; python main.py"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ifc-parser-service; python main.py"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd calculation-engine-service; python main.py"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd cost-calculator-service; python main.py"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 3d-data-service; python main.py"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd database-manager-service; python main.py"

Write-Host ""
Write-Host "✅ All services started in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  - API Gateway: http://localhost:8000"
Write-Host "  - IFC Parser: http://localhost:5001"
Write-Host "  - Calculation Engine: http://localhost:5002"
Write-Host "  - Cost Calculator: http://localhost:5003"
Write-Host "  - 3D Data: http://localhost:5004"
Write-Host "  - Database Manager: http://localhost:5005"
Write-Host ""

