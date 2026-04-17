param(
    [string]$Secret,
    [string]$BaseUrl
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

function Get-DotEnvValue {
    param(
        [string]$Name
    )

    if (!(Test-Path ".env")) {
        return $null
    }

    $prefix = "$Name="
    $line = Get-Content ".env" | Where-Object {
        $_ -and -not $_.TrimStart().StartsWith("#") -and $_.StartsWith($prefix)
    } | Select-Object -First 1

    if (-not $line) {
        return $null
    }

    return $line.Substring($prefix.Length).Trim()
}

function Invoke-Webhook {
    param(
        [string]$Url,
        [string]$Body,
        [string]$Signature
    )

    try {
        $response = Invoke-WebRequest -Method Post -Uri $Url -Body $Body -ContentType "application/json" -Headers @{
            "X-Razorpay-Signature" = $Signature
        }
        return @{
            status = [int]$response.StatusCode
            body = $response.Content
        }
    }
    catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        return @{
            status = $statusCode
            body = $errorBody
        }
    }
}

try {
    $backendPort = Get-DotEnvValue -Name "BACKEND_PORT"
    if (-not $backendPort) {
        $backendPort = "8000"
    }

    if (-not $BaseUrl) {
        $BaseUrl = "http://localhost:$backendPort"
    }

    $enabledRaw = (Get-DotEnvValue -Name "ENABLE_RAZORPAY_WEBHOOK")
    if (-not $enabledRaw) {
        $enabledRaw = "false"
    }
    $enabled = $enabledRaw.ToLower() -eq "true"

    if (-not $enabled) {
        throw "ENABLE_RAZORPAY_WEBHOOK must be true in .env to validate signature verification"
    }

    if (-not $Secret) {
        $Secret = (Get-DotEnvValue -Name "RAZORPAY_WEBHOOK_SECRET")
    }

    if (-not $Secret) {
        throw "RAZORPAY_WEBHOOK_SECRET is required (pass -Secret or set it in .env)"
    }

    $payloadBody = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_smoke_local","notes":{"payout_id":"999999"}}}}}'

    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $hashBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payloadBody))
    $signature = ([System.BitConverter]::ToString($hashBytes)).Replace("-", "").ToLower()

    $webhookUrl = "$BaseUrl/api/v1/payments/razorpay/webhook"

    Write-Host "[SecureSync] Sending signed webhook to $webhookUrl"
    $valid = Invoke-Webhook -Url $webhookUrl -Body $payloadBody -Signature $signature
    Write-Host "[SecureSync] Valid signature response: $($valid.status) $($valid.body)"

    $invalid = Invoke-Webhook -Url $webhookUrl -Body $payloadBody -Signature "invalid-$signature"
    Write-Host "[SecureSync] Invalid signature response: $($invalid.status) $($invalid.body)"

    if ($valid.status -eq 401) {
        throw "Valid signature was rejected (401). Check secret alignment between script and backend container"
    }

    if ($invalid.status -ne 401) {
        throw "Invalid signature did not return 401. Signature verification path may not be active"
    }

    Write-Host "[SecureSync] Razorpay webhook signature smoke passed"
}
finally {
    Pop-Location
}
