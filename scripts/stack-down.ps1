param(
    [switch]$DeleteVolumes
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
    if ($DeleteVolumes) {
        Write-Host "[SecureSync] Stopping stack and removing volumes..."
        docker compose down --volumes
    }
    else {
        Write-Host "[SecureSync] Stopping stack..."
        docker compose down
    }
}
finally {
    Pop-Location
}
