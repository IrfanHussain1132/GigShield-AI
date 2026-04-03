$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
    $names = @("OPENWEATHER_KEY", "IQAIR_KEY", "TOMTOM_KEY")
    $found = @{}

    $historyPaths = @()
    try {
        $historyPaths += (Get-PSReadLineOption).HistorySavePath
    }
    catch {
    }

    $historyPaths += "$HOME\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt"
    $historyPaths += "$HOME\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\Visual Studio Code Host_history.txt"
    $historyPaths = $historyPaths | Select-Object -Unique

    foreach ($historyPath in $historyPaths) {
        if (!(Test-Path $historyPath)) {
            continue
        }

        $lines = Get-Content $historyPath

        foreach ($name in $names) {
            if ($found.ContainsKey($name)) {
                continue
            }

            $regex1 = ('\$env:{0}\s*=\s*["''][^"'']+["'']' -f [regex]::Escape($name))
            $regex2 = ('\b{0}\s*=\s*["''][^"'']+["'']' -f [regex]::Escape($name))

            for ($i = $lines.Count - 1; $i -ge 0; $i--) {
                $line = $lines[$i]
                $m1 = [regex]::Match($line, $regex1)
                $m2 = [regex]::Match($line, $regex2)

                if ($m1.Success) {
                    $parts = $line.Split("=", 2)
                    if ($parts.Count -eq 2) {
                        $found[$name] = $parts[1].Trim().Trim([char]34, [char]39)
                    }
                    break
                }
                if ($m2.Success) {
                    $parts = $line.Split("=", 2)
                    if ($parts.Count -eq 2) {
                        $found[$name] = $parts[1].Trim().Trim([char]34, [char]39)
                    }
                    break
                }
            }
        }
    }

    if (!(Test-Path ".env")) {
        throw ".env not found at repository root"
    }

    $envLines = Get-Content ".env"

    foreach ($name in $names) {
        if ($found.ContainsKey($name) -and -not [string]::IsNullOrWhiteSpace($found[$name])) {
            for ($j = 0; $j -lt $envLines.Count; $j++) {
                if ($envLines[$j] -match "^$name=") {
                    $envLines[$j] = "$name=$($found[$name])"
                    break
                }
            }
        }
    }

    Set-Content ".env" $envLines

    foreach ($name in $names) {
        $line = $envLines | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
        if (-not $line) {
            Write-Output "$name=<missing>"
            continue
        }

        $value = $line.Split("=", 2)[1]
        if ([string]::IsNullOrWhiteSpace($value)) {
            Write-Output "$name=<missing>"
        }
        else {
            Write-Output "$name=<set:$($value.Length) chars>"
        }
    }
}
finally {
    Pop-Location
}
