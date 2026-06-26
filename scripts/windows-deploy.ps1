# =============================================================================
# Reno System — Windows Deployment Script (PowerShell)
# Provides the same workflow as deploy.sh for Windows environments.
# Usage: .\scripts\windows-deploy.ps1 -Environment staging -ImageTag v26.0.0
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('staging', 'production')]
    [string]$Environment,

    [Parameter(Mandatory)]
    [string]$ImageTag,

    [switch]$SkipEnvValidation,
    [switch]$SkipMigration,
    [switch]$SkipHealthCheck
)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent $PSScriptRoot

function Write-Step { param([string]$Msg) Write-Host "`n>>> $Msg" -ForegroundColor Cyan }
function Write-OK   { param([string]$Msg) Write-Host "    OK: $Msg" -ForegroundColor Green }
function Write-Fail { param([string]$Msg) Write-Host "    FAIL: $Msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  Reno Windows Deployment" -ForegroundColor Yellow
Write-Host "  Environment : $Environment" -ForegroundColor Yellow
Write-Host "  Image tag   : $ImageTag" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

# ---- Prerequisite check ----
Write-Step "Checking prerequisites..."
$DockerVersion = docker version --format '{{.Server.Version}}' 2>$null
if (-not $DockerVersion) { Write-Fail "Docker is not running. Start Docker Desktop and retry." }
Write-OK "Docker $DockerVersion"

$ComposeFile = Join-Path $RootDir "docker-compose.$Environment.yml"
if (-not (Test-Path $ComposeFile)) { Write-Fail "Compose file not found: $ComposeFile" }
Write-OK "Compose file found: docker-compose.$Environment.yml"

# ---- Env validation ----
if (-not $SkipEnvValidation) {
    Write-Step "Validating required environment variables..."
    $Required = @('DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET',
                  'ENCRYPTION_KEY', 'BACKUP_ENCRYPTION_KEY', 'RESTORE_APPROVAL_TOKEN', 'OPENAI_API_KEY')
    $Missing = @()
    foreach ($Var in $Required) {
        $Val = [Environment]::GetEnvironmentVariable($Var)
        if ([string]::IsNullOrEmpty($Val)) {
            $Missing += $Var
            Write-Host "    MISSING: $Var" -ForegroundColor Red
        } else {
            Write-Host "    OK:      $Var" -ForegroundColor Green
        }
    }
    if ($Missing.Count -gt 0) {
        Write-Fail "$($Missing.Count) required variable(s) not set. Copy .env.$Environment.example and fill in values."
    }
}

# ---- Migration ----
if (-not $SkipMigration) {
    Write-Step "Running database migrations..."
    pnpm --filter @reno/database exec prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { Write-Fail "Migration failed." }
    Write-OK "Migrations applied."
}

# ---- Pull images ----
Write-Step "Pulling images (tag: $ImageTag)..."
$env:IMAGE_TAG = $ImageTag
docker compose -f $ComposeFile pull
if ($LASTEXITCODE -ne 0) { Write-Fail "Docker pull failed." }

# ---- Deploy ----
Write-Step "Deploying $Environment (tag: $ImageTag)..."
docker compose -f $ComposeFile up -d --no-build
if ($LASTEXITCODE -ne 0) { Write-Fail "Docker Compose up failed." }

# ---- Health check ----
if (-not $SkipHealthCheck) {
    Write-Step "Waiting for API to be healthy..."
    $Port = if ($Environment -eq 'staging') { 4001 } else { 4000 }
    $Url = "http://localhost:$Port/health"
    $MaxAttempts = 24
    $Interval = 5
    $Healthy = $false

    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
            if ($Response.StatusCode -eq 200) {
                Write-OK "Healthy after $($i * $Interval)s"
                $Healthy = $true
                break
            }
        } catch {
            # Not yet ready
        }
        Write-Host "    Attempt $i/$MaxAttempts — waiting ${Interval}s..."
        Start-Sleep -Seconds $Interval
    }

    if (-not $Healthy) { Write-Fail "Health check timed out after $($MaxAttempts * $Interval)s." }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Deployment complete: $Environment @ $ImageTag" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
