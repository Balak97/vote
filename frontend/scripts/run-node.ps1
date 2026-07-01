# Contourne le conflit avec "Microsoft HPC Pack" qui expose aussi un node.exe
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Script,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ScriptArgs
)

$nodeCandidates = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\node\node.exe"
)

$nodeExe = $nodeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $nodeExe) {
    Write-Error "Node.js introuvable. Installez-le depuis https://nodejs.org/"
    exit 1
}

$root = Split-Path $PSScriptRoot -Parent
$scriptPath = Join-Path $root $Script

if (-not (Test-Path $scriptPath)) {
    Write-Error "Script introuvable : $scriptPath"
    exit 1
}

& $nodeExe $scriptPath @ScriptArgs
exit $LASTEXITCODE
