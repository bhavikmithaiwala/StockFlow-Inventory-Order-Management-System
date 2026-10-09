param(
  [string]$MongoExecutable = 'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $MongoExecutable)) { throw 'MongoDB executable not found. Pass -MongoExecutable.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
$mongoData = Join-Path $projectRoot 'tools\mongodb\data'
$mongoLog = Join-Path $projectRoot 'tools\mongodb\mongod.log'
New-Item -ItemType Directory -Path $mongoData -Force | Out-Null
$mongoProcess = Start-Process -FilePath $MongoExecutable -ArgumentList @('--replSet', 'rs0', '--bind_ip', '127.0.0.1', '--port', '27018', '--dbpath', ('"' + $mongoData + '"'), '--logpath', ('"' + $mongoLog + '"')) -WindowStyle Hidden -PassThru
Write-Output "Started isolated MongoDB process $($mongoProcess.Id) on port 27018. Run npm run db:init."
