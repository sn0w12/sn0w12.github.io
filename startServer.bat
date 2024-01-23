@echo off
cd /d %~dp0
start python -m http.server 8081
start http://localhost:8080/index.html
pause