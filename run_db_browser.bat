@echo off
echo.
echo ====================================
echo  Calendar Database Browser
echo ====================================
echo.
echo Starting database browser...
echo Open your browser and go to: http://localhost:5001
echo.
echo WARNING: Make sure your main calendar app is not running
echo          to avoid database locking issues.
echo.
echo Press Ctrl+C to stop the database browser
echo.

cd /d "%~dp0"
python db_browser_fixed.py

pause