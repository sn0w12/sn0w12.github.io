@echo off
cd /d %~dp0
echo Your computer's IP address(es):
ipconfig | findstr /i "IPv4"
start python -m http.server 8080 --bind 0.0.0.0
start http://localhost:8080/
echo.
echo To access from other devices, use: http://YOUR_IP:8080
echo (Use one of the IPv4 addresses shown above)
pause