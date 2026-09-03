@echo off
title AI Ambulance Decision Engine - Master Launcher
echo ============================================================
echo Launching AI-Powered Ambulance Routing System...
echo ============================================================
start "FastAPI AI Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 3 >nul
start "React Command Center" cmd /k "cd frontend && npm run dev"
echo Both services started!
echo Frontend: http://localhost:5173
echo Backend Docs: http://localhost:8000/docs
pause
