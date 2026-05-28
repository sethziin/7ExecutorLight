param(
    [switch]$Force
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackupRoot = Join-Path $ProjectRoot "snapshots"

if (-not (Test-Path $BackupRoot)) {
    Write-Host "[!] Nenhum snapshot encontrado." -ForegroundColor Red
    exit 1
}

$latest = Get-ChildItem -LiteralPath $BackupRoot -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latest) {
    Write-Host "[!] Nenhum snapshot disponivel." -ForegroundColor Red
    exit 1
}

Write-Host "[*] Restaurando snapshot mais recente: $($latest.Name)" -ForegroundColor Cyan
& "$ProjectRoot\restore-snapshot.ps1" -Name $latest.Name -Force:$Force
