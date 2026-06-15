param(
    [int] $Port = 8080
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$publicRoot = Join-Path $root "public"
$storageApp = Join-Path $root "storage\app"
$logDir = Join-Path $root "storage\logs"

New-Item -ItemType Directory -Force -Path $storageApp, $logDir | Out-Null

$php = (Get-Command php -ErrorAction Stop).Source
$phpDir = Split-Path $php
$extensionDir = Join-Path $phpDir "ext"
$iniPath = Join-Path $storageApp "local-php.ini"

@"
extension_dir="$extensionDir"
extension=curl
extension=fileinfo
extension=gd
extension=intl
extension=mbstring
extension=openssl
extension=pdo_mysql
extension=sodium
extension=zip
date.timezone=UTC
memory_limit=512M
upload_max_filesize=50M
post_max_size=60M
max_execution_time=180
"@ | Set-Content -Path $iniPath -Encoding ASCII

$existing = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $existing) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq "php") {
        Stop-Process -Id $processId -Force
    }
}

$outLog = Join-Path $logDir "php-server.log"
$errLog = Join-Path $logDir "php-server-error.log"
$arguments = "-c `"$iniPath`" -S 127.0.0.1:$Port -t `"$publicRoot`""

$server = Start-Process -FilePath $php `
    -ArgumentList $arguments `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -PassThru

Start-Sleep -Seconds 1

$loadedExtensions = & $php -c $iniPath -m
$required = @("curl", "fileinfo", "gd", "intl", "mbstring", "openssl", "PDO", "pdo_mysql", "sodium", "zip")
$missing = $required | Where-Object { $loadedExtensions -notcontains $_ }

if ($missing.Count -gt 0) {
    throw "PHP server started, but required extensions are missing: $($missing -join ', ')"
}

Write-Output "Started PHP server PID $($server.Id) at http://127.0.0.1:$Port"
