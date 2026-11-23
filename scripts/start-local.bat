@echo off
cd /d "%~dp0\.."
docker compose up -d --build
echo.
echo Ifa Boru School results is starting.
echo On this PC open http://localhost:43123
echo On phones and other PCs, use this computer's Wi-Fi address.
echo Find it with: ipconfig
echo Example: http://192.168.1.20:43123
pause
