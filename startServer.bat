@echo off
cd /d %~dp0
start python -m http.server 8080
start http://localhost:8080/
start http://localhost:8080/world.html
start http://localhost:8080/cities.html
start http://localhost:8080/characters.html
start http://localhost:8080/timeline.html
pause