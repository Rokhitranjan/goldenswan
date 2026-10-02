# Starts local MongoDB server using local mongodb_data directory
$dataDir = Join-Path $PSScriptRoot "..\mongodb_data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}

$mongoBin = "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe"
if (-not (Test-Path $mongoBin)) {
    $mongoBin = "mongod"
}

Write-Host "Starting MongoDB on 127.0.0.1:27017 using data directory $dataDir ..." -ForegroundColor Cyan
& $mongoBin --dbpath $dataDir --bind_ip 127.0.0.1 --port 27017
