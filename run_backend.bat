@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-25
cd backend
echo Starting Stego Backend with H2 and JAVA_HOME=%JAVA_HOME%...
call .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=h2
pause
