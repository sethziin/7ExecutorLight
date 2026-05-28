param(
    [string]$Name = "",
    [switch]$Force,
    [switch]$ListOnly
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackupRoot = Join-Path $ProjectRoot "snapshots"

# === LIST MODE =======================================
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

# === VALIDATE ========================================
if (-not (Test-Path $BackupRoot)) {
    Write-Host "[!] Pasta de snapshots nao encontrada: $BackupRoot" -ForegroundColor Red
    Write-Host "    Nenhum backup disponivel para restaurar." -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Name)) {
    # Auto-detect: use the latest snapshot
    $latest = Get-ChildItem -LiteralPath $BackupRoot -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Host "[!] Nenhum snapshot encontrado em: $BackupRoot" -ForegroundColor Red
        exit 1
    }
    $Name = $latest.Name
    Write-Host "[*] Usando snapshot mais recente: $Name" -ForegroundColor Cyan
}

$SnapshotDir = Join-Path $BackupRoot $Name
if (-not (Test-Path $SnapshotDir)) {
    Write-Host "[!] Snapshot nao encontrado: $SnapshotDir" -ForegroundColor Red
    Write-Host "    Use -ListOnly para ver snapshots disponiveis." -ForegroundColor Yellow
    exit 1
}

# === LOAD MANIFEST ===================================
$manifestPath = Join-Path $SnapshotDir "snapshot-info.json"
$manifest = $null
if (Test-Path $manifestPath) {
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  RESTAURAR SNAPSHOT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Snapshot:    $Name" -ForegroundColor White
if ($manifest) {
    Write-Host "  Data:        $($manifest.timestamp)" -ForegroundColor White
    Write-Host "  Label:       $($manifest.label)" -ForegroundColor White
    Write-Host "  Arquivos:    $($manifest.copiedFiles)" -ForegroundColor White
    Write-Host "  Tamanho:     $($manifest.totalSizeMB) MB" -ForegroundColor White
    if ($manifest.gitCommit -and $manifest.gitCommit -ne "N/A") {
        Write-Host "  Git Commit:  $($manifest.gitCommit)" -ForegroundColor White
        Write-Host "  Git Branch:  $($manifest.gitBranch)" -ForegroundColor White
    }
}
Write-Host ""
Write-Host "  ORIGEM:  $SnapshotDir" -ForegroundColor Green
Write-Host "  DESTINO: $ProjectRoot" -ForegroundColor Red
Write-Host ""

if (-not $Force) {
    Write-Host "  [!] ATENCAO: Isso substituira TODOS os arquivos" -ForegroundColor Yellow
    Write-Host "      atuais do projeto pelos arquivos do snapshot!" -ForegroundColor Yellow
    Write-Host "      Arquivos modificados serao SOBRESCRITOS." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "  Continuar? (s/N) "
    if ($confirm -ne "s") {
        Write-Host "  Restauracao cancelada." -ForegroundColor Gray
        exit 0
    }
}

# === CHECK IF VS IS OPEN =============================
$vsProcesses = @("devenv", "Code", "MSBuild")
$running = $false
foreach ($proc in $vsProcesses) {
    if (Get-Process -Name $proc -ErrorAction SilentlyContinue) {
        Write-Host "[!] AVISO: $proc esta rodando. Feche o Visual Studio/Code antes de restaurar." -ForegroundColor Yellow
        $running = $true
    }
}
if ($running -and -not $Force) {
    $confirm = Read-Host "  Continuar mesmo assim? (s/N) "
    if ($confirm -ne "s") { Write-Host "Cancelado."; exit 0 }
}

# === COLLECT SNAPSHOT FILES ==========================
Write-Host "[*] Coletando arquivos do snapshot..." -ForegroundColor Green
$snapshotFiles = Get-ChildItem -LiteralPath $SnapshotDir -Recurse -File | Where-Object {
    $_.FullName -notlike "*\snapshot-info.json" -and
    $_.FullName -notlike "*\README.txt" -and
    $_.FullName -notlike "*\copy-errors.log"
}

$totalFiles = $snapshotFiles.Count
Write-Host "     $totalFiles arquivos a restaurar" -ForegroundColor Gray

# === BACKUP CURRENT STATE FIRST (pre-restore safety) ===
$preRestoreBackup = Join-Path $BackupRoot "_pre-restore-backup-$Name-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "[*] Criando backup de seguranca do estado atual..." -ForegroundColor Green
New-Item -ItemType Directory -Path $preRestoreBackup -Force | Out-Null

foreach ($file in $snapshotFiles) {
    $relative = $file.FullName.Substring($SnapshotDir.Length + 1)
    $currentFile = Join-Path $ProjectRoot $relative
    if (Test-Path $currentFile) {
        $backupDest = Join-Path $preRestoreBackup $relative
        $backupDir = Split-Path -Parent $backupDest
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $currentFile -Destination $backupDest -Force
    }
}
Write-Host "     Backup pre-restore salvo em: $preRestoreBackup" -ForegroundColor Gray

# === RESTORE FILES ===================================
Write-Host "[*] Restaurando arquivos..." -ForegroundColor Green
$restored = 0
$restoreErrors = @()

foreach ($file in $snapshotFiles) {
    $relative = $file.FullName.Substring($SnapshotDir.Length + 1)
    $dest = Join-Path $ProjectRoot $relative
    $destDir = Split-Path -Parent $dest

    try {
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
        $restored++
        if ($restored % 200 -eq 0) {
            Write-Host "  ... $restored / $totalFiles" -ForegroundColor Gray
        }
    } catch {
        $errMsg = "[!] Falha ao restaurar: $relative - $($_.Exception.Message)"
        $restoreErrors += $errMsg
    }
}

# === REMOVE ORPHAN FILES =============================
Write-Host "[*] Removendo arquivos orfaos (presentes no projeto mas nao no snapshot)..." -ForegroundColor Green
$orphanCount = 0
$orphanErrors = @()
$projectFiles = Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File | Where-Object {
    $relative = $_.FullName.Substring($ProjectRoot.Length + 1)
    $inSnapshot = Join-Path $SnapshotDir $relative
    $skip = $false
    foreach ($excl in @('node_modules', 'bin', 'obj', '.vs', 'snapshots', '.git')) {
        if ($_.FullName -like "*\$excl\*") { $skip = $true; break }
    }
    if ($_.Name -like "*.user") { $skip = $true }
    if ($skip) { return $false }
    -not (Test-Path $inSnapshot)
}

foreach ($file in $projectFiles) {
    try {
        Remove-Item -LiteralPath $file.FullName -Force
        $orphanCount++
    } catch {
        $errMsg = "[!] Falha ao remover orfao: $($file.FullName) - $($_.Exception.Message)"
        $orphanErrors += $errMsg
    }
}
Write-Host "     $orphanCount arquivos orfaos removidos" -ForegroundColor Gray

# === VALIDATION ======================================
Write-Host "[*] Validando integridade da restauracao..." -ForegroundColor Green
$validationErrors = @()
foreach ($file in $snapshotFiles) {
    $relative = $file.FullName.Substring($SnapshotDir.Length + 1)
    $dest = Join-Path $ProjectRoot $relative
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

# === SUMMARY =========================================
Write-Host ""
if ($validationErrors.Count -eq 0) {
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "  RESTAURACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "  Snapshot:  $Name" -ForegroundColor White
    Write-Host "  Restaurados: $restored / $totalFiles" -ForegroundColor White
    Write-Host "  Orfaos removidos: $orphanCount" -ForegroundColor White
    Write-Host ""
    Write-Host "  Backup do estado anterior salvo em:" -ForegroundColor Yellow
    Write-Host "    $preRestoreBackup" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Para desfazer esta restauracao:" -ForegroundColor Yellow
    Write-Host "    .\restore-snapshot.ps1 -Name `"_pre-restore-backup-$Name-*`"" -ForegroundColor Yellow
    Write-Host "    (substitua * pelo timestamp exato)" -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Green
} else {
    Write-Host "=============================================" -ForegroundColor Red
    Write-Host "  RESTAURACAO COM ERROS!" -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Red
    foreach ($err in $validationErrors) {
        Write-Host "  $err" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  [!] Ha $($validationErrors.Count) arquivos com problemas." -ForegroundColor Red
    Write-Host "  O backup do estado anterior esta em:" -ForegroundColor Yellow
    Write-Host "    $preRestoreBackup" -ForegroundColor Yellow
}

if ($restoreErrors.Count -gt 0) {
    $errLog = Join-Path $ProjectRoot "restore-errors.log"
    $restoreErrors -join "`n" | Set-Content -LiteralPath $errLog -Encoding UTF8
    Write-Host "  [$($restoreErrors.Count)] erros de restauracao em: restore-errors.log" -ForegroundColor Yellow
}
