# PowerShell script to test backend
Write-Host "Testing backend startup..." -ForegroundColor Green

# Change to backend directory
Set-Location backend

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Yellow
node index.js
