# SecureSync AI 🛡️

**AI-Powered Parametric Income Insurance for Food Delivery Partners**

> Built for **Guidewire DEVTrails 2026** · In partnership with EY & NIA · Phase 1 — Seed

> *"We don't ask workers to prove their loss. The data proves it — and we pay instantly."*

**Demo Video:** [Watch here](#) &nbsp;|&nbsp; **Repository:** [GitHub](#)

---

## Table of Contents
- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Persona & Scenarios](#-persona--real-world-scenarios)
- [Application Workflow](#-application-workflow)
- [Platform Choice](#-platform-choice)
- [Weekly Premium Model](#-weekly-premium-model)
- [Parametric Triggers](#-parametric-triggers)
- [AI/ML Integration Plan](#-aiml-integration-plan)
- [Fraud Detection](#-fraud-detection)
- [Adversarial Defense & Anti-Spoofing Strategy](#-adversarial-defense--anti-spoofing-strategy)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Development Plan](#-development-plan)
- [Future Enhancements](#-future-enhancements)

---

## 🚨 The Problem

India has over **15 lakh active delivery partners** across Zomato (8.94 lakh) and Swiggy (6.91 lakh) as of late 2024. Despite powering a ₹50,000+ crore industry, they are classified as *"partners"* — not employees — with zero income protection.

Per TeamLease Services data, metro delivery partners earn **₹20,000–₹30,000/month** (≈ ₹88/hr, ₹5,500/week). This income is entirely incentive-dependent — missing a 4-hour slab due to rain collapses a full day's earnings from ₹900 to under ₹350.

External disruptions — heavy rain, extreme heat, hazardous AQI, curfews — cause **20–30% monthly income loss** with no recourse. No financial product in India today covers this. **SecureSync AI is built to close this gap.**

---

## 💡 Our Solution

SecureSync AI is a **zero-touch parametric income insurance platform** for Swiggy and Zomato delivery partners:

- Worker buys a **weekly policy** matched to their earnings cycle
- Backend **monitors live APIs** every 15 minutes — no worker involvement needed
- When a disruption threshold is crossed, a **payout fires automatically**
- Money hits the worker's UPI within minutes — **no claim filed, ever**

> Coverage scope: Income loss from external disruptions only. Health, life, accidents, and vehicle repairs are strictly excluded.

---

## 👤 Persona & Real-World Scenarios

**Rajan Kumar, 28 — Swiggy Partner, South Chennai**
Monthly ≈ ₹23,000 · Hourly ≈ ₹88 · Weekly ≈ ₹5,500 · Device: Redmi Android (~₹12,000) · Zero savings buffer.

**Scenario 1 — Heavy Rainfall**
> Tuesday 3 PM, Chennai. IMD Orange Alert. Rainfall crosses 70 mm — IMD "Heavy Rain" threshold.

Without SecureSync AI, Rajan waits 4 hours under a flyover and misses his incentive slab — earnings collapse to ₹350. With SecureSync AI, the Trigger Monitor auto-detects ≥ 64.5 mm/day at 3:12 PM, creates a `disruption_event`, matches his policy, and transfers **₹88 × 4 hrs = ₹352** via Razorpay — before he even checks his phone.

**Scenario 2 — Extreme Heat** (Hyderabad, May)
Max temp ≥ 40°C (IMD Heat Wave threshold for plains) → 4-hour payout: **₹352** auto-transferred.

**Scenario 3 — Severe AQI** (Delhi, November)
AQI > 300 (CPCB "Very Poor") → 5-hour payout: **₹440** auto-transferred.

**Scenario 4 — Curfew / Strike** (Any city)
Civil disruption webhook confirmed → full-day payout: **8 hrs × ₹88 = ₹704** before noon.

---

## ⚙️ Application Workflow

```
Sign Up → AI Risk Profiling → Buy Weekly Policy → Auto Monitoring → Auto Payout
```

| Step | Actor | Action |
|------|-------|--------|
| 1. Onboarding | Worker | City, zone, platform, weekly income — under 2 minutes |
| 2. Risk Profiling | ML Model | XGBoost returns premium in < 200ms |
| 3. Policy Purchase | Worker | Pay via Razorpay UPI — policy activates immediately |
| 4. Monitoring | Backend cron | Polls OpenWeatherMap, AQICN, IMD RSS every 15 minutes |
| 5. Trigger | Parametric Engine | Threshold crossed → `disruption_event` → policyholders identified |
| 6. Fraud Check | ML Service | Isolation Forest scores claim before payout fires |
| 7. Payout | Razorpay API | `Avg Hourly Income × Disruption Hours` → UPI + push notification |

---

## 📱 Platform Choice

**Decision: Mobile-first Progressive Web App (PWA)**

PWA wins because: no Play Store barrier (partners share links on WhatsApp), lighter on ₹10,000–₹15,000 Android devices, instant deploys without app updates, and a single Next.js codebase fits our 6-week schedule. Designed at 390×844px with 48px+ touch targets and Noto Sans for Tamil/Telugu/Hindi support.

---

## 💰 Weekly Premium Model

```
weekly_premium = base_rate × zone_multiplier × weather_multiplier × history_multiplier
```

| Component | Range | Basis |
|-----------|-------|-------|
| Base Rate | ₹50 fixed | Platform operations at 65% target loss ratio |
| Zone Multiplier | 0.7× – 2.8× | 5-year IMD + AQICN historical disruption frequency per zone |
| Weather Multiplier | 0.9× – 1.6× | 7-day forecast: rain probability, AQI trend, max temp |
| History Multiplier | 0.85× – 1.25× | Worker's personal claim rate vs. zone average |

| Worker Profile | Weekly Premium |
|----------------|---------------|
| Bengaluru, low-risk, clear forecast | ~₹65 |
| Hyderabad, medium-risk, 1 prior claim | ~₹140 |
| Chennai monsoon zone, clean history | ~₹190 |

At ₹190/week, Rajan pays **3.5% of weekly income** to protect against a 20–30% loss. Target loss ratio: 65%.

---

## ⚡ Parametric Triggers

All thresholds grounded in official Indian standards — IMD for weather, CPCB for air quality.

| # | Trigger | Source | Threshold | Payout Hours |
|---|---------|--------|-----------|-------------|
| 1 | 🌧️ Heavy Rainfall | OpenWeatherMap | ≥ 64.5 mm/day (IMD "Heavy Rain") | 4 hrs |
| 2 | 🌫️ Severe AQI | AQICN | AQI > 300 (CPCB "Very Poor") | 5 hrs |
| 3 | 🌡️ Heat Wave | OpenWeatherMap | Max temp ≥ 40°C (IMD plains) | 4 hrs |
| 4 | 🌊 Flood / Red Alert | IMD RSS | Active Red Warning for zone | 8 hrs |
| 5 | 🚫 Curfew / Strike | Webhook | Civil event confirmed in zone | 8 hrs |

IMD scale: Light < 7.5 mm · Moderate 7.6–35.5 mm · Rather Heavy 35.6–64.4 mm · **Heavy ≥ 64.5 mm ← trigger** · Very Heavy ≥ 124.5 mm.
CPCB scale: Poor 201–300 · **Very Poor 301–400 ← trigger** · Severe 401–500.

Payouts only fire when the reading is confirmed for the worker's **registered zone** during their **active policy window**.

---

## 🤖 AI/ML Integration Plan

### Module 1 — Dynamic Premium (XGBoost Regressor)

Called at policy purchase. **Inputs:** zone disruption history (5-yr IMD/AQICN), 7-day rain/AQI/temp forecast, worker's claim count, declared income, month. **Output:** `weekly_premium` in ₹, min ₹50, returned in < 200ms. Trained on 18 months of synthetic IMD-calibrated data; retrains weekly on real outcomes.

### Module 2 — Fraud Scoring (Isolation Forest)

Called before every payout. **Features scored:** claim frequency vs. zone peers, time since policy purchase, GPS vs. cell tower zone match, device ID uniqueness, payout vs. declared income, duplicate event flag. **Output:** `fraud_score` (0–1).

```
Score < 0.30    → Auto-approve, payout immediately
Score 0.30–0.65 → Soft flag, payout fires, async review logged
Score > 0.65    → Hard hold, manual review within 2 hours
```

No labelled fraud data needed in Phase 1. Supervised Random Forest layer added in Phase 3.

---

## 🔒 Fraud Detection

| Rule | Detail |
|------|--------|
| **Zone Lock** | Zone fixed 30 days from signup; changes trigger 7-day waiting period |
| **Duplicate Event Block** | One payout per worker per `disruption_event` regardless of event duration |
| **Income Cap** | Weekly payout cannot exceed declared income, validated against city average |

---

## 🛡️ Adversarial Defense & Anti-Spoofing Strategy

GPS verification is obsolete — a ₹200 spoofing app fakes coordinates instantly. SecureSync AI defends through **multi-signal coherence scoring**: a spoofer can fake GPS, but cannot simultaneously fake cell tower ID, device motion, peer behaviour, and session timing.

### 1. The Differentiation — Genuine Worker vs. GPS Spoofer

| Signal | Genuine Worker | GPS Spoofer |
|--------|---------------|-------------|
| Device GPS in disruption zone | ✅ Yes | ✅ Faked |
| **Cell tower ID in disruption zone** | ✅ Yes | ❌ Reveals real location |
| Session in zone 2+ hrs before event | ✅ Yes | ❌ Sudden zone jump |
| Device accelerometer | ✅ Stationary (parked bike) | ❌ Indoor idle pattern |
| Zone peers also paused | ✅ Yes | ✅ Yes (real event) |

**Cell tower triangulation is the key defence.** Android logs tower IDs alongside GPS continuously. Tower IDs cannot be spoofed — they require physical proximity. We cross-reference the last 3 tower IDs from the session against the disruption zone's coverage map. Mismatch → spoofing flag raised immediately.

### 2. The Data — Detecting Coordinated Fraud Rings

| Signal | What It Catches |
|--------|----------------|
| Device fingerprint (ID + model + resolution hash) | Multiple accounts on one device |
| Cell tower sequence (last 5 IDs) | Real physical location |
| Registration metadata (IP, timestamp, referral) | Batch signups from same IP = ring staging |
| UPI account linkage | Multiple workers routing to one UPI/bank |
| Claim timestamp clustering (< 500ms across accounts) | Scripted simultaneous submissions |
| Zone signup spike (50+ new accounts pre-storm) | Pre-fraud staging before predicted event |

**Phase 3 — Graph Detection:** Bipartite graph of workers, devices, UPI accounts. Any node connected to > 2 worker accounts is auto-escalated.

```
Normal:      Worker A ── Device 1 ── UPI-A
Fraud ring:  Workers A,B,C,D ── Devices 1,2 ── UPI-X  ← dense cluster = flagged
```

### 3. The UX Balance — No Honest Worker Gets Penalised

Bad weather creates the exact conditions that cause false positives. Our routing separates *technical failures* from *behavioural fraud*:

```
Score < 0.30,  any reason         → AUTO-PAY    instant payout, zero friction
Score 0.30–0.65, NETWORK_WEAK     → GRACE-PAY   payout fires immediately, async review only
Score 0.30–0.65, ZONE_MISMATCH    → SOFT-HOLD   one-tap confirm, auto-releases in 2 hrs
Score > 0.65                      → HARD-HOLD   manual review within 2 hours
```

**Grace-Pay** ensures workers sheltering during a storm receive their payout immediately — pay first, verify async. **Soft-Hold** prompts: *"Signal was unclear. Tap to confirm you were in Zone 4."* One tap closes 90%+ of cases within 30–45 minutes.

| Situation | Worker Sees | Internal Action |
|-----------|------------|-----------------|
| Auto-pay | "₹352 transferred. Stay safe." | Score logged |
| Grace-pay | "₹352 transferred. Stay safe." | Async review queued |
| Soft-hold | "Confirming location — payout in ~30 min." | ML re-scores with cell data |
| Hard hold | "Verifying your claim — update in 2 hours." | Manual review |
| Confirmed fraud | "Account paused. Contact support." | Flagged, policy voided |

The word "fraud" never appears in worker-facing messages for the first four categories.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14, TypeScript | Mobile-first PWA |
| Backend | Node.js, Express, TypeScript | API, Trigger Monitor, business logic |
| ML Service | Python 3.9+, Flask, XGBoost, Scikit-learn | Premium + fraud scoring |
| Database | PostgreSQL | Workers, policies, events, claims, payouts |
| Payments | Razorpay (Sandbox) | UPI payout simulation |
| Deployment | Docker, Docker Compose | `docker-compose up --build` |
| Weather | OpenWeatherMap API | Rainfall, temperature, 7-day forecast |
| Air Quality | AQICN API | Real-time AQI by zone |
| Flood Alerts | IMD RSS Feed | Official Red/Orange alerts |
| Civil Events | Mock Webhook | Simulated curfew/strike for demo |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL APIs                                  │
│  OpenWeatherMap   AQICN   IMD RSS Feed   Razorpay           │
└──────┬──────────────┬───────────┬──────────────┬────────────┘
       │ polls/15min  │           │              │ bidirectional
       ▼              ▼           ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND  —  Node.js · Express · TypeScript                 │
│  REST API (port 4000)  +  Trigger Monitor (cron, 15 min)    │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
    ┌──────────▼────────┐  ┌──────────▼──────────────┐
    │  FRONTEND          │  │  ML SERVICE              │
    │  Next.js 14 PWA    │  │  Python · Flask          │
    │  port 3000         │  │  XGBoost + IForest       │
    └────────────────────┘  └──────────────────────────┘
                                        │
                            ┌───────────▼────────────┐
                            │  PostgreSQL             │
                            │  workers · policies     │
                            │  events · claims        │
                            └────────────────────────┘
```


## 🚀 Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **H3 Geospatial Indexing** | Uber's hexagonal grid for sub-kilometre zone precision |
| **RL Premium Engine** | Self-tuning model optimising adoption vs. loss ratio |
| **Graph Neural Network Fraud** | Full GNN on worker-device-UPI graph for ring detection |
| **Causal Inference Validation** | Ensure payouts are caused by disruptions, not coincidental |
| **Platform API Integration** | Swiggy/Zomato API to verify active delivery status |
| **Smart Contract Execution** | Polygon blockchain for tamper-proof automatic payouts |
| **Multi-language UI** | Tamil, Telugu, Hindi, Kannada |
| **GRAP-linked AQI Triggers** | Delhi GRAP stages for legally defensible AQI thresholds |

---

> **Built for Guidewire DEVTrails 2026 · In partnership with EY & NIA**
> *Protecting India's 15+ lakh delivery partners — one parametric trigger at a time.*
> Target: DEVSummit Bangalore · May 2026 · Prize Pool: ₹6,00,000
