param(
    [int]$Port = 8768
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $name, $value = $line -split "=", 2
            $name = $name.Trim()
            if ($name -and $null -ne $value -and -not (Test-Path "Env:$name")) {
                Set-Item -Path "Env:$name" -Value $value.Trim()
            }
        }
    }
}

if (-not $env:SECRET_KEY) {
    $env:SECRET_KEY = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
}

if (-not $env:LARO_LEDGER_DATABASE_URL) {
    $env:LARO_LEDGER_DATABASE_URL = "sqlite:///instance/laro_ledger.sqlite3"
}

if (-not $env:LARO_UPLOAD_ROOT) {
    $env:LARO_UPLOAD_ROOT = "instance/uploads"
}

if (-not $env:LARO_HOST) {
    $env:LARO_HOST = "127.0.0.1"
}

$env:PORT = if ($PSBoundParameters.ContainsKey("Port")) {
    "$Port"
} elseif ($env:LARO_FLASK_PORT) {
    $env:LARO_FLASK_PORT
} elseif ($env:PORT) {
    $env:PORT
} else {
    "8768"
}
if (-not $env:LARO_DEBUG) {
    $env:LARO_DEBUG = "false"
}

New-Item -ItemType Directory -Force -Path "instance", $env:LARO_UPLOAD_ROOT | Out-Null

Write-Host "Starting LARO at http://$($env:LARO_HOST):$($env:PORT)/case_command_center.html"
python app.py
