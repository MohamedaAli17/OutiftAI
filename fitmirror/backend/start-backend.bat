@echo off
cd /d "%~dp0"
echo Starting FitMirror outfit scanner + API on http://127.0.0.1:8000
py -m uvicorn main:app --reload --port 8000
pause
