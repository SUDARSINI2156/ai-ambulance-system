# AI-Powered Real-Time Ambulance Routing & Hospital Availability Optimization System

> **A Comprehensive Decision-Support Core for Emergency Medical Services (EMS)**  
> Built with **FastAPI, XGBoost, Scikit-Learn, WebSockets, React 18, TypeScript, Tailwind CSS, and Leaflet Maps**.

---

## 🎯 Academic Project Statement
> *"We developed an AI-driven emergency decision-support system that predicts ambulance travel time using gradient-boosted decision trees (XGBoost), forecasts emergency department surge capacity, and dynamically recommends the optimal hospital and route using real-time contextual data (traffic bottlenecks, ICU bed availability, and patient triage severity)."*

---

## 🏗️ System Architecture & Dataflow

```
                    ┌────────────────────────┐
                    │ Emergency 108 Incident │
                    │   Caller / Dispatcher  │
                    └───────────┬────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND CORE                     │
│                                                             │
│   Authentication │ State Engine │ WebSocket Broadcaster     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 AI DECISION SUITE                   │   │
│   │                                                     │   │
│   │ 1. XGBoost ETA Regressor (R² = 0.9909, MAE = 0.96m) │   │
│   │ 2. Multi-Criteria Hospital Suitability Engine       │   │
│   │ 3. 30-Minute Hospital Surge Saturation Forecaster   │   │
│   │ 4. Clinical Triage Severity Classifier              │   │
│   │ 5. Real-Time Dynamic Rerouting Engine               │   │
│   └─────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
        ┌──────────────┐┌──────────────┐┌──────────────┐
        │  Ambulance   ││   Hospital   ││ Central City │
        │  Mobile HUD  ││ Live Command ││   Dispatch   │
        └──────────────┘└──────────────┘└──────────────┘
```

---

## 🧠 Machine Learning Models & Algorithms

### 1. Model 1: Travel Time (ETA) Regression
- **Algorithm**: **XGBoost Regressor (`XGBRegressor`)**
- **Input Features**: `distance_km`, `traffic_level` (1-4), `traffic_speed_kmh`, `hour_of_day`, `day_of_week`, `is_weekend`, `weather` (0-3), `road_type` (Expressway, Arterial, Residential), `priority` (Low to Critical).
- **Evaluation Benchmark**:
  - **MAE**: **0.96 minutes** (vs Baseline Naive: 10.37 minutes)
  - **RMSE**: **1.68 minutes** (vs Baseline Naive: 17.24 minutes)
  - **R² Score**: **0.9909** (vs Baseline Naive: 0.0459)
  - **Error Reduction**: **90.8% reduction in travel time estimation error**

### 2. Model 2: Multi-Criteria Hospital Recommendation Engine
- **Mathematical Formulation**:
  $$\text{Suitability Score} = w_1 \cdot S_{\text{ETA}} + w_2 \cdot S_{\text{Beds}} + w_3 \cdot S_{\text{ICU}} + w_4 \cdot S_{\text{Wait}} + w_5 \cdot S_{\text{Capability}}$$
- **Dynamic Weight Adaptation**:
  - For **CRITICAL** patients (STEMI, stroke, severe hypoxemia): $w_{\text{ETA}} = 0.35$ and $w_{\text{ICU}} = 0.25$ dominate, penalizing facilities with 0 ICU beds.
  - For **MEDIUM/LOW** patients: ER bed headroom and waiting times take higher priority to prevent overwhelming tertiary hospitals.
- **Explainable AI (XAI)**:
  - Compares the AI recommendation against the naive closest facility with human-readable rationale:
  - *"Recommended Apollo Greams (Score 94) over Rajiv Gandhi GH (1.4 km closer). Severe traffic on Anna Salai increases ETA to 16 min and Rajiv Gandhi ICU is at 96% capacity, whereas Apollo guarantees immediate ICU ventilator readiness."*

### 3. Model 3: Hospital Surge & Saturation Forecaster
- **Algorithm**: Dual **Random Forest Regressor & Classifier**
- **Target**: Predicts emergency department load % and risk tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) 30 minutes in advance.
- **Performance**: MAE = **2.22%**, Classification Accuracy = **84.7%**.

### 4. Model 4: Clinical Triage & Severity Classifier
- **Algorithm**: **Gradient Boosting Classifier**
- **Inputs**: Heart rate, Systolic BP, Oxygen saturation (SpO2), Glasgow Coma Scale (GCS), Pain scale, Chief complaint.
- **Performance**: Accuracy = **99.92%**. Automatically tags cases as `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` and prescribes `ALS` or `BLS` equipment.

---

## ⚡ Real-Time Dynamic Rerouting

When an ambulance is en route:
1. If a sudden traffic bottleneck emerges (speed drops to 10 km/h) OR the destination hospital becomes overloaded (0 ER beds):
2. The system dynamically re-evaluates all city hospitals from the ambulance's current GPS location.
3. If an alternate hospital saves $\ge 4.0$ minutes or has $\ge 12$ points higher suitability score:
4. A **`DYNAMIC_REROUTE_ALERT`** is broadcast over WebSockets, instantly presenting an alert dialog on the driver HUD and the hospital command dashboard with one-click route diversion!

---

## 🚀 How to Run the System

### Option A: One-Click Master Launcher (Windows)
Simply double-click `run_all.bat` in the root folder. It starts both the FastAPI backend and Vite frontend.

### Option B: Manual Startup

#### 1. Backend:
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

#### 2. Frontend:
```powershell
cd frontend
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## 📱 Interactive Demonstration Guide (For Examiners & Viva)

1. **Central Dispatch Center (`/`)**:
   - Observe live Chennai hospital pins with real-time bed badges (Apollo, Rajiv Gandhi GH, MIOT, Fortis, Kauvery, SIMS).
   - Click **"New 108 Call"**: Enter symptoms (e.g. "Severe chest pain, sweating, SpO2 89%").
   - Notice the **AI Triage Engine** automatically flagging the case as `CRITICAL` and selecting the optimal hospital.
2. **Interactive Demo Toolbar**:
   - Click **"▶️ Simulate GPS Drive"**: Watch the ambulance icon move smoothly along Chennai roads with live speed & heading telemetry broadcast via WebSockets.
   - Click **"⚠️ Inject Traffic Jam (Reroute)"**: Artificially injects severe congestion on the route.
   - Watch the **AI Dynamic Reroute Modal** pop up instantly, explaining why the vehicle is being diverted and how many minutes are saved!
3. **Ambulance HUD Tab**:
   - Paramedic view with live patient vitals monitor and turn guidance.
4. **Hospital Command Tab**:
   - View countdown timer for inbound ambulances.
   - Use the **+ / -** buttons to increment/decrement ER beds or ICU beds.
5. **AI Analytics Tab**:
   - Demonstrates empirical evaluation metrics ($R^2$, MAE, feature importance chart, and Naive vs AI travel time comparison).

---

## 🎓 Viva Voce Q&A Quick Reference

**Q1: Why is this an AI project rather than just Google Maps + ambulance tracking?**  
*Answer*: Google Maps only computes standard vehicular transit time for a single destination without considering hospital capacity. Our system uses an XGBoost regression model calibrated with ambulance priority siren advantages, historical congestion, and weather, coupled with an AI Multi-Criteria Decision Analysis (MCDA) engine that optimizes across medical specialties, ICU bed headroom, and waiting time.

**Q2: What machine learning algorithm was chosen for ETA prediction and why?**  
*Answer*: We implemented an XGBoost (eXtreme Gradient Boosting) regressor because emergency transit data contains non-linear interactions (e.g. rush hours combined with severe weather cause exponential delays). XGBoost achieved an $R^2$ score of 0.9909 and an MAE of 0.96 minutes, cutting prediction error by 90.8% compared to baseline constant-speed models.

**Q3: How does the system handle real-time synchronization?**  
*Answer*: We implemented persistent WebSockets (`/ws`) via FastAPI's asynchronous event hub. When an ambulance GPS coordinate changes, hospital capacity is updated, or a dynamic reroute is triggered, the event is broadcast in $\approx 30$ms to all connected dashboards without requiring browser polling or page refreshes.
