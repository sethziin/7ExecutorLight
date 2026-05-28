param(
    [string]$SnapshotName = "",
    [switch]$ListOnly
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# === CONFIG ==========================================
$BackupRoot = Join-Path $ProjectRoot "snapshots"
$Excludes = @(
    'node_modules',
    'bin',
    'obj',
    '.vs',
    'snapshots',
    '*.user',
    '.git'
)

# === SNAPSHOT NAME ===================================
if ($ListOnly) {
    Write-Host "`n=== SNAPSHOTS DISPONIVEIS ===" -ForegroundColor Cyan
    if (Test-Path $BackupRoot) {
        Get-ChildItem -LiteralPath $BackupRoot -Directory | Sort-Object LastWriteTime -Descending | ForEach-Object {
            $meta = Join-Path $_.FullName "snapshot-info.json"
            $tag = ""
            if (Test-Path $meta) {
                $info = Get-Content -Raw -LiteralPath $meta | ConvertFrom-Json
                $tag = " [$($info.label)]"
            }
            Write-Host "  $($_.Name)$tag" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  (nenhum snapshot encontrado)" -ForegroundColor Gray
    }
    return
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
if ([string]::IsNullOrWhiteSpace($SnapshotName)) {
    $SnapshotName = "pre-multiapi-$timestamp"
}
$SnapshotDir = Join-Path $BackupRoot $SnapshotName

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SNAPSHOT BACKUP" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Projeto:     $ProjectRoot"
Write-Host "Destino:     $SnapshotDir"
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# === CREATE SNAPSHOT DIR =============================
if (Test-Path $SnapshotDir) {
    Write-Host "[!] Snapshot '$SnapshotName' ja existe." -ForegroundColor Yellow
    $confirm = Read-Host "Sobrescrever? (s/N) "
    if ($confirm -ne "s") { Write-Host "Cancelado."; return }
    Remove-Item -LiteralPath $SnapshotDir -Recurse -Force
}
New-Item -ItemType Directory -Path $SnapshotDir -Force | Out-Null

# === COLLECT FILES ===================================
Write-Host "[*] Coletando arquivos..." -ForegroundColor Green
$files = Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File | Where-Object {
    $include = $true
    foreach ($excl in $Excludes) {
        if ($_.FullName -like "*\$excl\*" -or $_.Name -like $excl) {
            $include = $false; break
        }
    }
    $include
}

$totalFiles = $files.Count
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum
Write-Host "     $totalFiles arquivos encontrados ($([math]::Round($totalSize / 1MB, 2)) MB)" -ForegroundColor Gray

# === COPY FILES ======================================
Write-Host "[*] Copiando arquivos..." -ForegroundColor Green
$copied = 0
$errors = @()

foreach ($file in $files) {
    $relative = $file.FullName.Substring($ProjectRoot.Length + 1)
    $dest = Join-Path $SnapshotDir $relative
    $destDir = Split-Path -Parent $dest

    try {
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
        $copied++
        if ($copied % 50 -eq 0) {
            Write-Host "  ... $copied / $totalFiles" -ForegroundColor Gray
        }
    } catch {
        $errMsg = "[!] Falha ao copiar: $relative - $($_.Exception.Message)"
        $errors += $errMsg
    }
}

Write-Host "  $copied / $totalFiles arquivos copiados." -ForegroundColor Green

# === CREATE MANIFEST =================================
Write-Host "[*] Criando manifesto..." -ForegroundColor Green

$description = @"
BEFORE MULTI-API REFACTOR
-------------------------
Estado funcional completo do projeto Executor antes das alteracoes:
  - Multi API suport (Velocity, Xeno, etc.)
  - DLLs com mesmo nome (QuorumAPI.dll)
  - Aliases e conflitos de namespace
  - Assembly collision / reflection loading
  - IPC / runtime state changes

Para restaurar: .\restore-snapshot.ps1 -Name "$SnapshotName"
"@

$gitCommit = "N/A"
$gitBranch = "N/A"
if (Get-Command git -ErrorAction SilentlyContinue) {
    $commit = & git -C $ProjectRoot rev-parse HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $commit) { $gitCommit = $commit[-1].Trim() }
    $branch = & git -C $ProjectRoot rev-parse --abbrev-ref HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $branch) { $gitBranch = $branch[-1].Trim() }
}

$manifest = @{
    snapshotName  = $SnapshotName
    label         = if ($SnapshotName -like "pre-multiapi*") { "PRE-MULTI-API - Estado funcional antes da refatoracao multi API" } else { "Snapshot manual" }
    timestamp     = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    projectRoot   = $ProjectRoot
    totalFiles    = $totalFiles
    copiedFiles   = $copied
    totalSizeMB   = [math]::Round($totalSize / 1MB, 2)
    gitCommit     = $gitCommit
    gitBranch     = $gitBranch
    machineName   = $env:COMPUTERNAME
    userName      = $env:USERNAME
    description   = $description
    restoreCmd    = ".\restore-snapshot.ps1 -Name `"$SnapshotName`""
}

$manifestPath = Join-Path $SnapshotDir "snapshot-info.json"
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

# Write a human-friendly README too
$readme = @"
====================================================
  SNAPSHOT: $SnapshotName
  DATA:     $((Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))
====================================================

Este snapshot contem o estado funcional completo do
projeto Executor ANTES da refatoracao multi API.

CONTEUDO:
  - Frontend (React/TypeScript/Vite)
  - Backend (C# .NET Framework 4.8 WinForms)
  - Dependencies (QuorumAPI.dll, Newtonsoft.Json.dll)
  - Packages (WebView2 NuGet)
  - Configuracoes (.csproj, .sln, tsconfig, etc.)
  - Assets e recursos

RESTAURAR:
  .\restore-snapshot.ps1 -Name "$SnapshotName"

  Ou via atalho:
  .\restore-to-latest.ps1

GIT:
  Commit: $gitCommit
  Branch: $gitBranch

MAQUINA:
  $env:COMPUTERNAME / $env:USERNAME
"@
$readmePath = Join-Path $SnapshotDir "README.txt"
$readme | Set-Content -LiteralPath $readmePath -Encoding UTF8

# === VALIDATION ======================================
Write-Host "[*] Validando integridade..." -ForegroundColor Green
$validationErrors = @()
foreach ($file in $files) {
    $relative = $file.FullName.Substring($ProjectRoot.Length + 1)
    $dest = Join-Path $SnapshotDir $relative
    if (-not (Test-Path $dest)) {
        $validationErrors += "[FALTANDO] $relative"
    } elseif ($file.Length -gt 0) {
        $srcHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm MD5).Hash
        $dstHash = (Get-FileHash -LiteralPath $dest -Algorithm MD5).Hash
        if ($srcHash -ne $dstHash) {
            $validationErrors += "[HASH MISMATCH] $relative"
        }
    }
}

$backupSize = Get-ChildItem -LiteralPath $SnapshotDir -Recurse -File | Measure-Object -Property Length -Sum
$backupSizeMB = [math]::Round($backupSize.Sum / 1MB, 2)

if ($validationErrors.Count -eq 0) {
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "  SNAPSHOT CRIADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "  Local:    $SnapshotDir" -ForegroundColor White
    Write-Host "  Arquivos: $copied" -ForegroundColor White
    Write-Host "  Tamanho:  $backupSizeMB MB" -ForegroundColor White
    Write-Host "  Manifesto: snapshot-info.json" -ForegroundColor White
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Para restaurar:" -ForegroundColor Yellow
    Write-Host "    .\restore-snapshot.ps1 -Name `"$SnapshotName`"" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Red
    Write-Host "  SNAPSHOT INCOMPLETO!" -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Red
    foreach ($err in $validationErrors) {
        Write-Host "  $err" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  [!] O snapshot pode estar corrompido." -ForegroundColor Red
}

# Copy errors if any
if ($errors.Count -gt 0) {
    $errLog = Join-Path $SnapshotDir "copy-errors.log"
    $errors -join "`n" | Set-Content -LiteralPath $errLog -Encoding UTF8
    Write-Host "  [$($errors.Count)] erros de copia registrados em: copy-errors.log" -ForegroundColor Yellow
}
