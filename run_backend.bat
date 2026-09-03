@echo off
title AI Ambulance Routing Backend Server
echo ============================================================
echo Starting AI Ambulance Routing FastAPI Backend Server (Port 8000)...
echo ============================================================
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
