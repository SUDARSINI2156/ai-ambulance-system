# 🚀 Complete Deployment & Hosting Guide

This guide walks you through pushing the **AI Ambulance & Hospital Optimization System** to GitHub and hosting it on cloud infrastructure.

---

## 📦 Option 1: 1-Click Master Local Run (Easiest)

You can run both Backend and Frontend on your machine with one click:
- Double click **`run_all.bat`** in the project root folder.
- Frontend: **http://localhost:5173**
- Backend Docs: **http://localhost:8000/docs**

---

## 🐙 Step 1: Push Code to GitHub

Open your PowerShell terminal in the project directory:

```powershell
# 1. Initialize git repository (if not already done)
git init

# 2. Add all files to git
git add .

# 3. Commit the company-ready codebase
git commit -m "feat: company-ready AI ambulance decision system with XGBoost, WebSockets, and React HUD"

# 4. Set branch to main
git branch -M main

# 5. Link to your GitHub repository
# (Create a new empty repo on https://github.com/new and copy the URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git

# 6. Push to GitHub!
git push -u origin main
```

---

## ☁️ Option 2: 1-Click Free Cloud Hosting on Render.com

[Render](https://render.com) offers **100% free hosting** for web services and static sites.

### Method A: Blueprint Auto-Deploy (Recommended)
1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in with GitHub.
2. Click **New +** -> Select **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect the included `render.yaml` file automatically and provision:
   - **`emergency-ai-backend`**: FastAPI AI Engine (Python 3.11).
   - **`emergency-ai-frontend`**: React Single Page App with automatic SPA routing rewrite.
5. Click **Apply**. Both your backend and frontend will be live with free HTTPS certificates!

### Method B: Manual Deploy on Render
1. **Deploy Backend**:
   - New **Web Service** -> Connect GitHub repo.
   - Root Directory: `backend`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt && python seed_data.py`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Click **Deploy Web Service**.
2. **Deploy Frontend**:
   - New **Static Site** -> Connect GitHub repo.
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variable: Add `VITE_API_BASE_URL` with your Render backend URL (e.g., `https://emergency-ai-backend.onrender.com`).
   - Add Rewrite Rule: `/*` -> `/index.html` (Rewrite).
   - Click **Deploy Static Site**.

---

## 🐳 Option 3: Production Docker Compose (Host Anywhere / AWS / VPS)

To deploy on any Linux server, DigitalOcean Droplet, AWS EC2, or local Docker Desktop:

```bash
# Clone repository
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git
cd "YOUR_REPOSITORY_NAME"

# Build and start all services in detached mode
docker-compose up -d --build
```

- **Frontend Application**: `http://YOUR_SERVER_IP` (Port 80)
- **Backend API & Docs**: `http://YOUR_SERVER_IP:8000/docs`
- **Healthcheck**: `http://YOUR_SERVER_IP:8000/api/health`

To view container logs:
```bash
docker-compose logs -f
```

To shut down:
```bash
docker-compose down
```

---

## 🚂 Option 4: Deploying on Railway.app

1. Log in to [Railway.app](https://railway.app/) using GitHub.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will automatically detect the Dockerfiles and deploy your full-stack system with persistent volume support!

---

## 🧪 Running Automated Tests Before Pushing

To verify the test suite locally:

```powershell
cd backend
python -m pytest -v
```

All tests for API endpoints, XGBoost ETA prediction, clinical triage, and hospital surge forecasting will execute and validate.
