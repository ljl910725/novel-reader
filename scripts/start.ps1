# NovelReader 一键启动脚本
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "=== NovelReader 启动 ===" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "已创建 .env 文件" -ForegroundColor Yellow
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    Write-Host "启动 PostgreSQL + Redis..." -ForegroundColor Green
    docker compose up -d
    Start-Sleep -Seconds 5
} else {
    Write-Host "未检测到 Docker，请确保 PostgreSQL 已在 localhost:5432 运行" -ForegroundColor Yellow
}

if (-not (Test-Path "node_modules")) {
    Write-Host "安装依赖..." -ForegroundColor Green
    pnpm install
}

Write-Host "数据库迁移..." -ForegroundColor Green
pnpm db:push
pnpm db:seed

Write-Host "启动服务（API + Web）..." -ForegroundColor Green
Write-Host "API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Web: http://localhost:5173" -ForegroundColor Cyan
Write-Host "演示账号: demo@novel.local / demo123" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root'; pnpm --filter @novel-reader/server dev"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root'; pnpm --filter @novel-reader/web dev"

Write-Host "完成！桌面端请另开终端运行: pnpm --filter @novel-reader/desktop dev:desktop" -ForegroundColor Green
