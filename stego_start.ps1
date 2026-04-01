$env:JAVA_HOME = "C:\Program Files\Java\jdk-25"
$java = "$env:JAVA_HOME\bin\java.exe"
$wrapperJar = ".mvn/wrapper/maven-wrapper.jar"

Write-Host "Updating environment for JDK 25..."
Push-Location backend

Write-Host "Starting Maven via Wrapper..."
# We use direct java call to bypass faulty .cmd quotes
& $java -classpath $wrapperJar org.apache.maven.wrapper.MavenWrapperMain spring-boot:run "-Dspring-boot.run.profiles=h2" "-DskipTests"

Pop-Location
