$ErrorActionPreference = 'Stop'

# Determine script root and backend directory
$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
$backendDir = Join-Path $scriptRoot 'backend'

# Resolve java executable
if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
	$javaExe = Join-Path $env:JAVA_HOME 'bin\java.exe'
} else {
	$javaCmd = Get-Command java -ErrorAction SilentlyContinue
	if ($javaCmd) {
		$javaExe = $javaCmd.Source
	} else {
		Write-Error "JAVA_HOME not set and 'java' not found on PATH. Please install Java or set JAVA_HOME."
		exit 1
	}
}
Write-Host "Using Java: $javaExe"
# If JAVA_HOME is not set, try to infer it from the java executable location
if (-not $env:JAVA_HOME) {
	try {
		$possibleJavaHome = Split-Path -Parent (Split-Path -Parent $javaExe)
		if (Test-Path (Join-Path $possibleJavaHome 'bin\java.exe')) {
			Write-Host "Setting JAVA_HOME to inferred location: $possibleJavaHome"
			$env:JAVA_HOME = $possibleJavaHome
		}
	} catch {
		# ignore inference failures
	}
}
# Try common Windows JDK install locations if JAVA_HOME still not set
if (-not $env:JAVA_HOME) {
	$candidates = @(
		'C:\Program Files\Java\jdk-25',
		'C:\Program Files\Java\jdk-21',
		'C:\Program Files\Java\jdk-17',
		'C:\Program Files (x86)\Java\jdk-17'
	)
	foreach ($c in $candidates) {
		if (Test-Path (Join-Path $c 'bin\java.exe')) {
			Write-Host "Setting JAVA_HOME to discovered installation: $c"
			$env:JAVA_HOME = $c
			break
		}
	}
}

# Enter backend directory
if (-not (Test-Path $backendDir)) {
	Write-Error "Backend directory not found at: $backendDir"
	exit 1
}
Push-Location $backendDir

# Prefer using maven wrapper jar if present
$wrapperJar = Join-Path $backendDir '.mvn\wrapper\maven-wrapper.jar'
if (Test-Path $wrapperJar) {
	Write-Host "Starting Maven via wrapper jar..."
	$mvnArgs = @(
		'--enable-native-access=ALL-UNNAMED'
		'-classpath'
		$wrapperJar
		'org.apache.maven.wrapper.MavenWrapperMain'
		'spring-boot:run'
		'-Dspring-boot.run.profiles=h2'
		'-DskipTests'
	)
	& $javaExe @mvnArgs
	$exitCode = $LASTEXITCODE
} elseif (Test-Path (Join-Path $backendDir 'mvnw.cmd')) {
	Write-Host "Wrapper jar missing; falling back to mvnw.cmd..."
	& (Join-Path $backendDir 'mvnw.cmd') 'spring-boot:run' '-Dspring-boot.run.profiles=h2' '-DskipTests'
	$exitCode = $LASTEXITCODE
} else {
	Write-Error "No maven wrapper found (.mvn\wrapper\maven-wrapper.jar or mvnw.cmd). Cannot start backend."
	Pop-Location
	exit 1
}

Pop-Location
exit $exitCode
