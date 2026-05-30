@echo off
cd /d "%~dp0"
echo Scanning outfits folder...
py ..\generate_manifest.py
echo.
echo FitMirror running at http://127.0.0.1:8000
echo Add/remove PNG or WebP files in outfits\ then refresh the browser.
echo.
start http://127.0.0.1:8000
py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause
