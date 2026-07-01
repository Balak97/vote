Write-Host "=== Walata Vote - Demarrage ===" -ForegroundColor Cyan

$root = $PSScriptRoot
Set-Location $root

Write-Host "`n[1/2] Backend (port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"

Start-Sleep -Seconds 2

Write-Host "[2/2] Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "`nOuverture du site..." -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "`nSite : http://localhost:5173" -ForegroundColor Green
Write-Host "API  : http://127.0.0.1:8001/docs" -ForegroundColor Green
