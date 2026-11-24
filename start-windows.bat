@echo off
REM Momo Play Wall - Windows starter: downloads the body-tracking model once, then serves the game locally.
cd /d "%~dp0"
if not exist "models\pose_landmarker_lite.task" (
  echo Downloading body tracking model (one time, about 6 MB)...
  powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' -OutFile 'models\pose_landmarker_lite.task'"
)
set PY=
where py >nul 2>nul && set PY=py
if "%PY%"=="" ( where python >nul 2>nul && set PY=python )
if "%PY%"=="" (
  echo.
  echo Python was not found. Install Python from https://www.python.org/downloads/ ^(tick "Add to PATH"^)
  echo or just double-click index.html instead ^(needs internet^).
  pause
  exit /b 1
)
start "" http://localhost:8765/index.html
echo Momo Play Wall is running at http://localhost:8765  -  close this window to stop.
%PY% -m http.server 8765 --bind 127.0.0.1
