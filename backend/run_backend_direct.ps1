param(
    [string]$JavaHome = 'C:\Program Files\Java\jdk-25',
    [string]$Jar = 'target\backend-0.0.1-SNAPSHOT.jar',
    [string]$Profile = 'h2'
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

if (-not (Test-Path $Jar)) {
    Write-Error "Jar not found: $Jar"
    exit 1
}

$javaExe = Join-Path $JavaHome 'bin\java.exe'
if (-not (Test-Path $javaExe)) {
    Write-Error "java.exe not found at: $javaExe"
    exit 1
}

$outLog = Join-Path $scriptDir 'backend_run.out.log'
$errLog = Join-Path $scriptDir 'backend_run.err.log'
Write-Host "Starting jar with Java: $javaExe -> logging to $outLog / $errLog"

$args = "-jar", (Resolve-Path $Jar).ProviderPath, "--spring.profiles.active=$Profile"

Start-Process -FilePath $javaExe -ArgumentList $args -RedirectStandardOutput $outLog -RedirectStandardError $errLog -NoNewWindow -PassThru | Out-Null
Start-Sleep -Seconds 2

Start-Sleep -Seconds 2
if (Test-Path $outLog) { Get-Content $outLog -Tail 120 -Wait:$false }
elseif (Test-Path $errLog) { Get-Content $errLog -Tail 120 -Wait:$false }
else { Write-Host "No log files found yet; check backend_run.out.log / backend_run.err.log later." }
