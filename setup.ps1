# Quick Start Script
Write-Host "Task Management Platform - Quick Start" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($null -eq $nodeVersion) {
    Write-Host "Node.js is not installed. Please install Node.js 18 or higher." -ForegroundColor Red
    exit 1
}
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Check if PostgreSQL is installed
$pgVersion = psql --version 2>$null
if ($null -eq $pgVersion) {
    Write-Host "PostgreSQL not found in PATH. Make sure it is installed." -ForegroundColor Yellow
} else {
    Write-Host "PostgreSQL: $pgVersion" -ForegroundColor Green
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Install root dependencies
npm install

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install

# Install frontend dependencies  
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location ../frontend
npm install

Set-Location ..

Write-Host ""
Write-Host "Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create a PostgreSQL database named 'taskmanagement'" -ForegroundColor White
Write-Host "2. Copy backend/.env.example to backend/.env and configure DATABASE_URL" -ForegroundColor White
Write-Host "3. Copy frontend/.env.example to frontend/.env (default values should work)" -ForegroundColor White
Write-Host "4. Run database setup commands:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run db:generate" -ForegroundColor Gray
Write-Host "   npm run db:migrate" -ForegroundColor Gray
Write-Host "   npm run db:seed" -ForegroundColor Gray
Write-Host "5. Run: npm run dev (from root directory)" -ForegroundColor White
Write-Host ""
Write-Host "See SETUP.md for detailed instructions" -ForegroundColor Yellow
