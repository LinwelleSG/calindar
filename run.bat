@echo off
echo.
echo ==========================================
echo         Calindar PWA Launcher
echo ==========================================
echo.

REM Use the virtual environment Python
set PYTHON_PATH=.venv\Scripts\python.exe

REM Check if virtual environment exists
if exist "%PYTHON_PATH%" (
    echo [1/2] Using virtual environment...
) else (
    echo [1/2] Virtual environment not found, using system Python...
    set PYTHON_PATH=python
)

echo [2/2] Starting Calindar PWA...
echo.
echo ==========================================
echo  🚀 Calindar is starting...
echo  
echo  📍 URL: http://127.0.0.1:5000
echo  
echo  🌐 Browser will open automatically
echo  ⏹️  Press Ctrl+C to stop the server
echo ==========================================
echo.

REM Start the browser after a short delay in background
start "" cmd /c "timeout /t 3 /nobreak >nul 2>&1 && start http://127.0.0.1:5000"

REM Start the Flask application
"%PYTHON_PATH%" app.py