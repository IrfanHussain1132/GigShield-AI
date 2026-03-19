<div align="center">

# GigShield AI 🛡️

**AI-Powered Parametric Income Insurance for Food Delivery Partners**

[![DEVTrails 2026](https://img.shields.io/badge/Guidewire-DEVTrails%202026-0052CC?style=for-the-badge&logoColor=white)](https://www.guidewiredevtrails.com/)
[![Phase](https://img.shields.io/badge/Phase-1%20Seed-brightgreen?style=for-the-badge)](https://www.guidewiredevtrails.com/)
[![Partner](https://img.shields.io/badge/Partner-EY%20%7C%20NIA-FFE600?style=for-the-badge&logoColor=black)](https://www.guidewiredevtrails.com/)

[![Next.js](https://img.shields.io/badge/Next.js%2014-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python%203.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-002970?style=flat-square&logo=razorpay&logoColor=white)](https://razorpay.com/)

> *"We don't ask workers to prove their loss. The data proves it — and we pay instantly."*

**🎬 Demo Video:** [Watch here](#) &nbsp;|&nbsp; **📂 Repository:** [GitHub](#)

</div>

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Persona & Scenarios](#-persona--real-world-scenarios)
- [Application Workflow](#-application-workflow)
- [Platform Choice](#-platform-choice--justification)
- [Weekly Premium Model](#-weekly-premium-model)
- [Parametric Triggers](#-parametric-triggers)
- [AI/ML Integration Plan](#-aiml-integration-plan)
- [Fraud Detection](#-fraud-detection)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Development Plan](#-development-plan)
- [Future Enhancements](#-future-enhancements)

---

## 🚨 The Problem

India has over **15 lakh active delivery partners** across Zomato and Swiggy alone — Zomato reported 8.94 lakh monthly active partners and Swiggy 6.91 lakh as of late 2024. These workers are the backbone of a ₹50,000+ crore food delivery industry, yet they are classified as *"partners,"* not employees — stripping them of every legal employment protection.

### The Income Reality

According to TeamLease Services data, a full-time delivery partner in a metro city earns a gross monthly income of **₹20,000–₹30,000**, depending on city, hours worked, and hitting incentive slabs. This translates to roughly:

- **Daily income:** ₹700–₹1,000 (working 10–12 hours)
- **Hourly income:** ₹70–₹100/hr
- **Weekly income:** ₹4,500–₹6,000

However, this income is entirely variable and **incentive-dependent**. Base pay per order on some routes has dropped from ₹40–₹45 to as low as ₹15–₹20, making hitting daily incentive slabs essential just to maintain previous income levels. Miss a slab because rain stopped you for 4 hours — and the entire day collapses.

### The Core Problem

External disruptions — extreme weather, flooding, hazardous air quality, curfews — can halt deliveries for hours or an entire day. When this happens:

- Workers lose **20–30% of their monthly income** with zero compensation
- Platforms bear no responsibility — the loss falls entirely on the worker
- Existing insurance products require paperwork and claim reviews — completely inaccessible to a smartphone-only gig worker
- No financial product in India today covers *income loss from external disruptions* for gig workers

**GigShield AI is built to close this gap.**

---

## 💡 Our Solution

GigShield AI is a **zero-touch parametric income insurance platform** for Swiggy and Zomato food delivery partners. It replaces the traditional claim-and-wait model with a fully automated data-driven engine:

- ✅ Worker buys a **weekly policy** (matched to how gig workers actually earn)
- ✅ Our system **monitors live APIs** continuously — no worker involvement needed
- ✅ When a disruption threshold is crossed, a **payout fires automatically**
- ✅ Money reaches the worker's UPI within minutes — **no claim filed, ever**

> **Coverage scope:** Income loss from external disruptions only. We strictly exclude health, life, accidents, and vehicle repairs as mandated by the problem statement.

---

## 👤 Persona & Real-World Scenarios

### Primary Persona

**Rajan Kumar, 28 — Swiggy Delivery Partner, South Chennai**

- Monthly earnings: ~₹23,000 (typical metro partner per TeamLease data)
- Works 10–11 hours/day, 6 days a week → hourly income ≈ ₹88/hr
- Weekly income: ~₹5,500
- Device: Redmi Android (₹12,000)
- No savings buffer — a single disrupted day means skipping the weekly incentive slab, collapsing the day's earnings from ₹900 to ₹300
- Has never filed any insurance claim in his life

---

### Scenario 1 — Heavy Rainfall (Most Frequent)

> *Tuesday, 3 PM. Chennai. IMD has issued an Orange Alert. Rainfall accumulation crosses 70 mm in 6 hours in Rajan's zone — well into IMD's "Rather Heavy" category.*

**Without GigShield AI:** Rajan parks his bike under a bridge, waits 4 hours. Misses his ₹400 daily incentive slab. Total day's earnings collapse from ₹900 to under ₹350. No recourse.

**With GigShield AI:**
1. The Trigger Monitor detects > 64.5 mm/day accumulation for Zone 4 at 3:12 PM
2. A `disruption_event` is created automatically
3. Rajan's active policy is matched — no action needed from him
4. Payout: ₹88/hr × 4 hrs = **₹352** initiated via Razorpay
5. Rajan gets a WhatsApp push: *"₹352 transferred to your UPI. Stay safe."*

---

### Scenario 2 — Extreme Heat (May–June, North & South India)

> *May afternoon in Hyderabad. Maximum temperature hits 43°C — IMD heat wave threshold for plains crossed. The platform starts throttling order assignments in affected zones.*

**With GigShield AI:** Trigger fires when max temperature ≥ 40°C (IMD heat wave declaration for plains). Workers registered in active heat-affected zones receive 4-hour compensation. Rajan's equivalent in Hyderabad gets ₹88 × 4 = **₹352** automatically.

---

### Scenario 3 — Severe Air Quality (Oct–Nov, North India)

> *November in Delhi. AQI crosses 310 — CPCB "Very Poor" category. GRAP Stage II restrictions apply, outdoor activity strongly discouraged.*

**With GigShield AI:** AQI > 300 trigger fires for affected zones. Workers receive 5-hour compensation: ₹88 × 5 = **₹440** automatically transferred. No claim, no delay.

---

### Scenario 4 — Curfew / Strike (Any City, Unpredictable)

> *An unannounced bandh shuts down delivery zones across a city for a full day. No pickups. No drops. Zero income.*

**With GigShield AI:** Webhook receives civil disruption alert. Full-day payout (8 hrs × ₹88 = **₹704**) fires to every active policyholder in affected zones before noon.

---

## ⚙️ Application Workflow

```
Sign Up → AI Risk Profiling → Buy Weekly Policy → Auto Monitoring → Auto Payout
```

| Step | Actor | What Happens |
|------|-------|--------------|
| 1. **Onboarding** | Worker | Signs up via mobile PWA. Enters city, delivery zone, platform (Swiggy/Zomato), and average weekly income. Under 2 minutes. |
| 2. **Risk Profiling** | ML Model | AI calculates risk score using zone history, 7-day forecast, and worker profile. Returns recommended weekly premium instantly (<200ms). |
| 3. **Policy Purchase** | Worker | Reviews coverage summary, pays via Razorpay UPI. Policy activates immediately for 7 days. |
| 4. **Continuous Monitoring** | Backend cron | Every 15 minutes, the Trigger Monitor polls OpenWeatherMap, AQICN, and IMD RSS for all active zones. |
| 5. **Disruption Detection** | Parametric Engine | Reading crosses threshold → `disruption_event` created → all active policyholders in zone identified automatically. |
| 6. **Fraud Check** | ML Service | Isolation Forest scores each claim for anomalies before payout fires. |
| 7. **Payout** | Razorpay API | `Payout = Avg Hourly Income × Disruption Hours` transferred to worker's UPI. Push notification sent. |

---

## 📱 Platform Choice & Justification

**Decision: Mobile-first Progressive Web App (PWA)**

| Factor | Native App | PWA (Our Choice) | Web Only |
|--------|-----------|-----------------|----------|
| Installation barrier | High — app store required | None — opens via WhatsApp link | None |
| Offline capability | Full | Partial (cached policy screen) | None |
| Push notifications | Yes | Yes (Web Push API) | No |
| Low-end Android support | Yes | Yes — lighter than native | Yes |
| Development speed for 6-week deadline | Slow (2 codebases) | Fast (single Next.js codebase) | Fast |
| GPS zone validation | Yes | Yes | Limited |

**Why PWA wins for this persona:**

1. **No app store friction.** Delivery partners discover services through WhatsApp links shared in partner groups. A PWA URL installs to the home screen in one tap — zero Play Store barrier.
2. **Low-end device performance.** Partners use Android phones averaging ₹10,000–₹15,000. PWAs are 60–70% lighter than native apps and perform well on 2–3 GB RAM devices.
3. **Instant updates.** New trigger types or UI changes deploy instantly — no partner needs to update an app.
4. **Team efficiency.** A single Next.js codebase serves both mobile and web, critical for our 6-week build timeline.

The app is designed at **390×844px** (standard Android viewport), with large 48px+ touch targets, Noto Sans typography supporting Tamil, Telugu, and Hindi natively, and bottom navigation throughout.

---

## 💰 Weekly Premium Model

Gig workers earn and spend weekly — so GigShield AI prices weekly, not monthly or annually. A worker pays at the start of each 7-day period and is covered immediately.

### Formula

```
weekly_premium = base_rate × zone_multiplier × weather_multiplier × history_multiplier
```

### Component Breakdown

| Component | Range | Basis |
|-----------|-------|-------|
| **Base Rate** | ₹50 fixed | Minimum reserve to cover platform operations and claim reserves at a 65% target loss ratio |
| **Zone Multiplier** | 0.7× – 2.8× | Historical disruption event frequency per zone, trained on IMD weather records and AQICN data over 5 years. A zone averaging 3 trigger events/year = 0.7×; a flood-prone zone with 20+ events/year = 2.8× |
| **Weather Multiplier** | 0.9× – 1.6× | 7-day forward risk using OpenWeatherMap forecast: rain probability, AQI trend, max temperature forecast |
| **History Multiplier** | 0.85× – 1.25× | Worker's personal claim rate vs. zone average. Clean history = discount; above-average claims = surcharge |

### How the Math Works

For a worker earning **₹5,500/week** (₹88/hr over a 10-hr day, 6 days):

- **Average disruption payout** (mix of 4-hr rain + 5-hr AQI + 8-hr full-day events) ≈ ₹440 per event
- **Expected payouts per week by zone risk:**

| Zone Risk | Events/Year (IMD-calibrated) | Expected Payout/Week | Premium at 65% LR |
|-----------|------------------------------|---------------------|-------------------|
| Low (e.g. Bengaluru dry season) | ~3–5 events | ₹33–₹50 | **~₹50–₹75** |
| Medium (e.g. Hyderabad) | ~8–12 events | ₹68–₹101 | **~₹105–₹155** |
| High (e.g. Chennai monsoon) | ~15–20 events | ₹127–₹169 | **~₹195–₹260** |

### Pricing Examples

| Worker | Zone Risk | 7-Day Forecast | Prior Claims | Final Premium |
|--------|-----------|----------------|-------------|---------------|
| Rajan, South Chennai | High | Rain likely (monsoon) | None | ~₹190/week |
| Priya, Koramangala, Bengaluru | Low | Clear | None | ~₹65/week |
| Arif, Banjara Hills, Hyderabad | Medium | Hot, dry | 1 prior claim | ~₹140/week |

### Business Viability

At ₹190/week, Rajan pays **3.5% of his ₹5,500 weekly income** for protection against losing 20–30% of it (₹1,100–₹1,650) in a single disruption. The value proposition is clear and the price point is below one skipped incentive slab.

**Target loss ratio: 65%** — ₹65 of every ₹100 premium goes to payouts; ₹35 covers operations, fraud reserves, and platform margin.

---

## ⚡ Parametric Triggers

Each trigger is a hard, objective threshold sourced from official Indian standards — IMD for weather and CPCB for air quality. There is no subjectivity, no worker input, and no manual review. If the API confirms the threshold was crossed in the worker's zone, the payout fires.

| # | Trigger | Data Source | Official Standard | Threshold Used | Payout Hours |
|---|---------|-------------|------------------|----------------|-------------|
| 1 | 🌧️ Heavy Rainfall | OpenWeatherMap API | IMD "Rather Heavy Rain" classification | ≥ 64.5 mm/day accumulation OR ≥ 8.5 mm/hr | 4 hrs |
| 2 | 🌫️ Severe Air Quality | AQICN API | CPCB AQI "Very Poor" category | AQI > 300 (PM2.5-based) | 5 hrs |
| 3 | 🌡️ Heat Wave | OpenWeatherMap API | IMD Heat Wave: max temp ≥ 40°C for plains | Max temp ≥ 40°C in zone | 4 hrs |
| 4 | 🌊 Flood / Red Alert | IMD RSS Feed | IMD Red Warning ("Take Action") | Active Red Alert for zone | 8 hrs (full day) |
| 5 | 🚫 Curfew / Strike | Webhook / News API | Civil disruption confirmed by authority | Event active and verified in zone | 8 hrs (full day) |

### Official Threshold Sources

**Rainfall — IMD Classification (per 24 hours):**

| IMD Category | Rainfall Amount | Our Trigger? |
|-------------|----------------|-------------|
| Light Rain | 2.5–15.5 mm | No — deliveries continue |
| Moderate Rain | 15.6–64.4 mm | No — slowed but not halted |
| Rather Heavy Rain | 64.5–115.5 mm | ✅ Yes — our trigger point |
| Very Heavy Rain | 115.6–204.4 mm | ✅ Yes — auto-triggered |
| Extremely Heavy Rain | > 204.4 mm | ✅ Yes — full-day payout |

We trigger at **IMD "Rather Heavy Rain"** (64.5 mm/day) — the point at which road flooding, zero visibility, and safety hazards effectively halt two-wheeler outdoor work in Indian cities.

**Air Quality — CPCB AQI Scale:**

| CPCB Category | AQI Range | Health Advisory | Our Trigger? |
|--------------|-----------|-----------------|-------------|
| Good | 0–50 | No impact | No |
| Satisfactory | 51–100 | Minor discomfort | No |
| Moderate | 101–200 | Sensitive groups affected | No |
| Poor | 201–300 | Most people affected | No |
| Very Poor | 301–400 | Respiratory illness on prolonged exposure | ✅ Yes — our trigger |
| Severe | 401–500 | Affects healthy people, serious risk | ✅ Yes |

We trigger at **CPCB AQI > 300 ("Very Poor")** — the level at which CPCB and health authorities actively advise against sustained outdoor physical activity.

**Heat Wave — IMD Definition:**
- IMD declares a Heat Wave when maximum temperature reaches **≥ 40°C on plains** AND departs from normal by ≥ 4.5°C
- Severe Heat Wave: ≥ 45°C
- We trigger at **max temp ≥ 40°C** — the IMD-recognised threshold at which outdoor labour becomes dangerous for sustained periods

### Fraud Guard on Triggers

Every trigger is zone-specific and time-bounded:
- Payouts only fire when the reading is confirmed for the **worker's registered delivery zone**, not just the city
- The reading must occur **within the worker's active 7-day policy window**
- The worker's last app GPS ping must place them **within or adjacent to the disruption zone** at the time of the event

---

## 🤖 AI/ML Integration Plan

GigShield AI uses machine learning at two points in the workflow: **premium calculation** before policy purchase, and **fraud detection** before every payout.

---

### Module 1 — Dynamic Premium Calculation

**Where it runs:** ML Service (Python/Flask), called by Backend at policy purchase time.
**Model:** XGBoost Regressor (Gradient Boosting)
**Response time target:** < 200ms

**Input Features:**

| Feature | Source | Type |
|---------|--------|------|
| Worker's delivery zone (lat/lng centroid) | User signup | Categorical |
| Zone's historical disruption event count (5-year IMD + AQICN data) | Pre-processed dataset | Numerical |
| 7-day cumulative rain probability for zone | OpenWeatherMap Forecast API | Numerical (0–1) |
| 7-day average AQI forecast | AQICN API | Numerical |
| 7-day max temperature forecast | OpenWeatherMap Forecast API | Numerical |
| Worker's claim count (past 90 days) | PostgreSQL | Numerical |
| Worker's declared weekly income (₹) | User signup | Numerical |
| Month (captures monsoon seasonality) | Derived | Categorical |
| Day of week policy purchased | Derived | Categorical |

**Output:** `weekly_premium` in ₹ (float, clipped to ₹50 minimum)

**Training strategy:** We generate 18 months of synthetic zone-weather-event-payout data using IMD historical records and AQICN archives to train an initial model. Once real policies are issued, the model retrains weekly on actual outcomes, improving zone risk estimates over time.

**Integration in user journey:**
```
Signup complete
  → Backend sends {zone, forecast features, claim history} to ML Service
  → XGBoost returns premium in <200ms
  → Frontend displays: "Your weekly premium: ₹190"
  → Worker pays → Policy activated
```

---

### Module 2 — Fraud Detection (Isolation Forest)

**Where it runs:** ML Service (Python/Flask), called before every payout.
**Model:** Isolation Forest (unsupervised anomaly detection)
**Why Isolation Forest:** Fraud is rare by nature — it is an outlier. Isolation Forest identifies outliers without requiring labelled fraud training data, which we won't have in Phase 1. A supervised layer (Random Forest classifier) will be added in Phase 3 as confirmed fraud cases accumulate.

**Features Scored Per Claim:**

| Feature | What It Catches |
|---------|----------------|
| Worker's claim frequency vs. zone average (past 30 days) | Unusually high claimers vs. peers in same zone |
| Time since policy purchase at first claim | Policies bought hours before a known storm — "storm chasers" |
| GPS zone at last app session vs. disruption zone | Worker registered in Zone 4 but app was active in Zone 9 during the event |
| Device ID uniqueness across accounts | Multiple accounts on the same device |
| Claimed payout vs. declared weekly income | Payout cannot mathematically exceed declared income |
| Duplicate event flag | Same disruption event cannot generate two payouts for one worker |

**Output:** `fraud_score` (0–1 float) + `flag` boolean

**Routing logic:**

```
fraud_score < 0.30  →  Auto-approve → payout fires immediately
fraud_score 0.30–0.65  →  Soft flag → payout fires, logged for async review
fraud_score > 0.65  →  Hard hold → payout paused, manual review within 2 hours
```

**Integration:**
```
Disruption event detected → affected policyholders identified
  → For each worker: ML Service scores claim features
  → Score returned → Backend routes to auto-pay or review queue
  → Payout fires or is held → Worker notified either way with reason
```

---

## 🔒 Fraud Detection

Beyond the ML scoring model, three hard rule-based guardrails apply that cannot be overridden by the model:

| Rule | Detail |
|------|--------|
| **Zone Lock** | Registered delivery zone is fixed for 30 days from signup. Zone changes trigger a 7-day waiting period before new zone coverage applies. |
| **Duplicate Event Block** | A single `disruption_event` record can generate only one payout per worker per policy period, regardless of how many polling cycles the event persists across. |
| **Income Cap** | Maximum payout in any 7-day window cannot exceed the worker's declared weekly income. Declarations are validated against the city-level average at signup. |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14, TypeScript | Mobile-first PWA — onboarding, policy management, payout history |
| Backend | Node.js, Express, TypeScript | Core API, Trigger Monitor cron, business logic, DB management |
| ML Service | Python 3.9+, Flask, XGBoost, Scikit-learn | Premium calculation (XGBoost), fraud detection (Isolation Forest) |
| Database | PostgreSQL | Workers, policies, disruption events, claims, payout records |
| Payments | Razorpay (Sandbox/Test mode) | UPI payout simulation |
| Deployment | Docker, Docker Compose | All services containerised — single `docker-compose up --build` |
| Weather | OpenWeatherMap API (free tier) | Hourly rainfall accumulation, max temp, daily forecasts |
| Air Quality | AQICN API (free tier) | Real-time AQI by city/zone |
| Flood Alerts | IMD RSS Feed (public) | Official Red/Orange alerts |
| Civil Events | Mock Webhook (internal) | Simulated curfew and strike events for demo |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       EXTERNAL APIs                          │
│   OpenWeatherMap    AQICN    IMD RSS Feed    Razorpay        │
└────────┬──────────────┬──────────┬──────────────┬───────────┘
         │  polls every │          │              │
         │  15 minutes  │          │    payout API (bidirectional)
         ▼              ▼          ▼              ▼
┌──────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│              Node.js · Express · TypeScript                  │
│  ┌────────────────────┐    ┌───────────────────────────┐    │
│  │   REST API          │    │   Trigger Monitor (cron)  │    │
│  │   Port: 4000        │    │   Runs every 15 minutes   │    │
│  │   /api/v1/...       │    │   Detects disruptions     │    │
│  └─────────┬──────────┘    └───────────┬───────────────┘    │
└────────────┼──────────────────────────┼────────────────────┘
             │                          │
    ┌─────────▼────────┐    ┌───────────▼────────────┐
    │    FRONTEND       │    │      ML SERVICE        │
    │   Next.js 14      │    │   Python · Flask       │
    │   Mobile PWA      │    │   XGBoost + IForest    │
    │   Port: 3000      │    │   Port: 5001           │
    └───────────────────┘    └───────────────────────┘
                                        │
                          ┌─────────────▼──────────┐
                          │       PostgreSQL        │
                          │  workers · policies     │
                          │  events · claims        │
                          └────────────────────────┘
```

**Communication pattern:** All REST over HTTP. The Trigger Monitor is a cron job internal to the Backend — it does not expose an external endpoint. All four services are containerised and orchestrated via Docker Compose.

---

## 📅 Development Plan

### Phase 1 — Seed (March 4–20) ← Current
- [x] Problem definition and gig worker income research
- [x] Persona development with real income data (TeamLease, IMD-calibrated)
- [x] README with complete strategy document
- [x] System architecture design
- [x] ML model design — inputs, algorithms, integration points
- [x] Figma prototype (8 screens)
- [ ] 2-minute strategy video → upload link to replace `[Watch here](#)` above

### Phase 2 — Scale (March 21–April 4)
- [ ] PostgreSQL schema — `workers`, `policies`, `disruption_events`, `claims`, `payouts`
- [ ] Backend REST API — registration, policy CRUD, premium endpoint, trigger monitor
- [ ] ML Service — XGBoost premium model trained on synthetic IMD-calibrated data
- [ ] Trigger Monitor — live polling of OpenWeatherMap + AQICN against IMD thresholds
- [ ] Razorpay sandbox integration — end-to-end test payout flow
- [ ] Frontend — onboarding (3 steps), policy purchase, active policy dashboard
- [ ] 2-minute demo video

### Phase 3 — Soar (April 5–17)
- [ ] Isolation Forest fraud model integrated pre-payout
- [ ] GPS zone validation — cross-reference app session location with disruption zone
- [ ] Admin dashboard — loss ratio tracker, disruption heatmap, claim review queue
- [ ] Worker dashboard — payout history, active coverage status, live zone conditions
- [ ] Simulated disruption demo — trigger synthetic rainstorm, show full auto-payout pipeline
- [ ] Final 5-minute walkthrough video (required: show simulated disruption → auto-claim → payout)
- [ ] Pitch deck PDF — persona, AI architecture, weekly premium business viability

---

## 🚀 Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **H3 Geospatial Indexing** | Replace city-level zones with Uber's hexagonal grid (H3) for sub-kilometre precision — prevents payouts to workers in adjacent, unaffected areas |
| **RL Premium Engine** | Self-tuning reinforcement learning model that learns the optimal weekly price to maximise worker adoption while keeping the loss ratio sustainable |
| **Graph Neural Network Fraud** | Build a relationship graph of all workers, devices, and claims to surface coordinated fraud rings invisible to per-claim anomaly scoring |
| **Causal Inference Validation** | Verify that a worker's income loss was *caused by* the disruption — not just coincidentally timed with it (workers who were offline anyway should not be paid) |
| **Platform API Integration** | Direct Swiggy/Zomato partner API integration to verify active delivery status during disruption windows |
| **Smart Contract Execution** | Encode policy terms on Polygon blockchain — tamper-proof, trustless automatic payouts that don't rely on GigShield's servers |
| **Multi-language UI** | Full support for Tamil, Telugu, Hindi, Kannada — not just English |
| **GRAP-linked AQI triggers** | Tie AQI triggers to Delhi's Graded Response Action Plan (GRAP) stages rather than just raw AQI numbers, for more legally defensible event definitions |

---

<div align="center">

**Built for [Guidewire DEVTrails 2026](https://www.guidewiredevtrails.com/) · In partnership with EY & NIA**

*Protecting India's 15+ lakh delivery partners — one parametric trigger at a time.*

[![Finalist Target](https://img.shields.io/badge/Target-DEVSummit%20Bangalore%20·%20May%202026-0052CC?style=flat-square)](https://www.guidewire.com/)
[![Prize Pool](https://img.shields.io/badge/Prize%20Pool-₹6%2C00%2C000-FFD700?style=flat-square)](https://www.guidewiredevtrails.com/)

</div>
