@echo off
setlocal
cd /d "%~dp0backend"
if not exist out mkdir out
javac -encoding UTF-8 -d out src\main\java\com\aerolab\*.java
if errorlevel 1 exit /b %errorlevel%
java -cp out com.aerolab.AeroLabServer
