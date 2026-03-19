# GigShield AI 🛡️

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
- [Platform Choice](#-platform-choice--justification)
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

India has over **15 lakh active delivery partners** across Zomato and Swiggy alone — Zomato reported 8.94 lakh monthly active partners and Swiggy 6.91 lakh as of the September 2024 quarter. These workers are the backbone of a ₹50,000+ crore food delivery industry, yet they are classified as *"partners,"* not employees — stripping them of every legal employment protection.

### The Income Reality

According to TeamLease Services data, a full-time delivery partner in a metro city earns a gross monthly income of **₹20,000–₹30,000**, depending on city, hours worked, and hitting incentive slabs. This works out to:

- **Daily income:** ₹700–₹1,000 (working 10–12 hours)
- **Hourly income:** ₹70–₹100/hr
- **Weekly income:** ₹4,500–₹6,000

This income is entirely variable and incentive-dependent. Base pay per order on some routes has dropped from ₹40–₹45 to as low as ₹15–₹20, making hitting daily incentive slabs essential just to maintain previous income levels. Miss a slab because rain stopped you for 4 hours — and the entire day's earnings collapse from ₹900 to under ₹350.

### The Core Problem

External disruptions — heavy rain, flooding, hazardous air quality, curfews — can halt deliveries for hours or a full day. When this happens:

- Workers lose **20–30% of their monthly income** with zero compensation
- Platforms bear no responsibility — the loss falls entirely on the individual worker
- Existing insurance products require paperwork and claim reviews — completely inaccessible to a smartphone-only gig worker
- No financial product in India today covers *income loss from external disruptions* for gig workers

**GigShield AI is built to close this gap.**

---

## 💡 Our Solution

GigShield AI is a **zero-touch parametric income insurance platform** for Swiggy and Zomato food delivery partners. It replaces the traditional claim-and-wait model with a fully automated data-driven engine:

- Worker buys a **weekly policy** matched to how gig workers actually earn
- Our system **monitors live APIs** continuously — no worker involvement needed
- When a disruption threshold is crossed, a **payout fires automatically**
- Money reaches the worker's UPI within minutes — **no claim filed, ever**

> **Coverage scope:** Income loss from external disruptions only. Health, life, accidents, and vehicle repairs are strictly excluded as required by the problem statement.

---

## 👤 Persona & Real-World Scenarios

### Primary Persona

**Rajan Kumar, 28 — Swiggy Delivery Partner, South Chennai**

- Monthly earnings: ~₹23,000 gross (TeamLease metro average)
- Works 10–11 hours/day, 6 days a week → effective hourly income ≈ ₹88/hr
- Weekly income: ~₹5,500
- Device: Redmi Android phone (~₹12,000)
- No savings buffer — one disrupted day means missing the weekly incentive slab, collapsing earnings from ₹900 to under ₹350
- Has never filed any insurance claim in his life

---

### Scenario 1 — Heavy Rainfall (Most Frequent)

> *Tuesday, 3 PM, Chennai. IMD has issued an Orange Alert. Rainfall accumulation crosses 70 mm in the day — crossing the IMD "Heavy Rain" threshold for Rajan's zone.*

**Without GigShield AI:** Rajan parks under a flyover, waits 4 hours, misses his ₹400 daily incentive slab. Day's earnings collapse to under ₹350. No recourse.

**With GigShield AI:**
1. Trigger Monitor detects ≥ 64.5 mm/day accumulation for Zone 4 at 3:12 PM
2. A `disruption_event` is automatically created in the database
3. Rajan's active policy is matched — no action needed from him
4. Payout: ₹88/hr × 4 hrs = **₹352** initiated via Razorpay
5. Rajan receives a push notification: *"₹352 transferred to your UPI. Stay safe."*

---

### Scenario 2 — Extreme Heat (May–June, Hyderabad / Delhi)

> *May afternoon, Hyderabad. Maximum temperature hits 43°C — crossing the IMD Heat Wave threshold for plains. The platform throttles order assignments in affected zones.*

**With GigShield AI:** Trigger fires at max temp ≥ 40°C (IMD heat wave declaration threshold for plains). Workers in active heat-affected zones receive 4-hour compensation automatically: ₹88 × 4 = **₹352** — no claim filed.

---

### Scenario 3 — Severe Air Quality (Oct–Nov, Delhi / NCR)

> *November, Delhi. AQI crosses 310 — CPCB "Very Poor" band. GRAP Stage II restrictions apply, outdoor activity strongly discouraged.*

**With GigShield AI:** AQI > 300 trigger fires for affected zones. Workers receive 5-hour compensation: ₹88 × 5 = **₹440** automatically transferred. No claim, no delay.

---

### Scenario 4 — Curfew / Strike (Any City, Unpredictable)

> *An unannounced bandh shuts down delivery operations across a city for a full day. No pickups, no drops, zero income.*

**With GigShield AI:** Webhook receives civil disruption alert. Full-day payout (8 hrs × ₹88 = **₹704**) fires to every active policyholder in the affected zones before noon.

---

## ⚙️ Application Workflow

```
Sign Up → AI Risk Profiling → Buy Weekly Policy → Auto Monitoring → Auto Payout
```

| Step | Actor | What Happens |
|------|-------|--------------|
| 1. **Onboarding** | Worker | Signs up via mobile PWA. Enters city, delivery zone, platform, and average weekly income. Under 2 minutes. |
| 2. **Risk Profiling** | ML Model | XGBoost model calculates risk score using zone history and 7-day forecast. Returns recommended premium in < 200ms. |
| 3. **Policy Purchase** | Worker | Reviews 7-day coverage summary, pays via Razorpay UPI. Policy activates immediately. |
| 4. **Continuous Monitoring** | Backend cron | Every 15 minutes, the Trigger Monitor polls OpenWeatherMap, AQICN, and IMD RSS for all active zones. |
| 5. **Disruption Detection** | Parametric Engine | Reading crosses threshold → `disruption_event` created → all active policyholders in that zone identified automatically. |
| 6. **Fraud Check** | ML Service | Isolation Forest scores each potential claim before payout fires. |
| 7. **Payout** | Razorpay API | `Payout (₹) = Avg Hourly Income × Disruption Hours` transferred to UPI. Push notification sent. |

---

## 📱 Platform Choice & Justification

**Decision: Mobile-first Progressive Web App (PWA)**

| Factor | Native App | PWA (Our Choice) | Web Only |
|--------|-----------|-----------------|----------|
| Installation barrier | High — app store required | None — opens via WhatsApp link | None |
| Offline capability | Full | Partial (cached policy screen) | None |
| Push notifications | Yes | Yes (Web Push API) | No |
| Low-end Android support | Yes | Yes — significantly lighter | Yes |
| Development speed | Slow — two codebases | Fast — single Next.js codebase | Fast |
| GPS zone validation | Yes | Yes | Limited |

**Why PWA is the right call for this persona:**

1. **No app store friction.** Partners discover services through WhatsApp links shared in rider groups. A PWA URL installs to the home screen in one tap — zero Play Store barrier.
2. **Low-end device performance.** Partners use Android devices averaging ₹10,000–₹15,000. PWAs are significantly lighter than native apps and perform well on 2–3 GB RAM devices common in this segment.
3. **Instant updates.** New trigger types or UI changes deploy immediately — no partner needs to update anything.
4. **Team efficiency.** A single Next.js codebase serves both mobile and web — critical for our 6-week build schedule.

The app is designed at 390×844px (standard Android viewport), with 48px+ touch targets, Noto Sans typography supporting Tamil, Telugu, and Hindi, and a persistent bottom navigation bar.

---

## 💰 Weekly Premium Model

Gig workers earn and spend weekly — so GigShield AI prices weekly, not monthly or annually. A worker pays at the start of each 7-day window and is covered immediately.

### Formula

```
weekly_premium = base_rate × zone_multiplier × weather_multiplier × history_multiplier
```

### Component Breakdown

| Component | Range | How It Is Calculated |
|-----------|-------|----------------------|
| **Base Rate** | ₹50 fixed | Minimum reserve to cover operations at a 65% target loss ratio |
| **Zone Multiplier** | 0.7× – 2.8× | AI model trained on 5 years of IMD and AQICN historical data per zone. A zone with 3 trigger events/year = 0.7×; a flood-prone zone with 20+ events/year = 2.8× |
| **Weather Multiplier** | 0.9× – 1.6× | 7-day forward risk: rain probability, AQI trend, max temperature forecast from OpenWeatherMap |
| **History Multiplier** | 0.85× – 1.25× | Worker's personal claim rate vs. zone average. Clean record = discount; above-average claims = small surcharge |

### How the Math Works

For a worker earning ₹5,500/week (₹88/hr, 10-hr days, 6 days):

- Average single disruption payout: ~₹352–₹440 (4–5 hour events)
- Expected annual events by zone risk, from IMD historical data:

| Zone Risk | Annual Trigger Events | Expected Payout/Week | Premium at 65% Loss Ratio |
|-----------|----------------------|----------------------|--------------------------|
| Low (Bengaluru dry season) | 3–5 | ₹33–₹50 | **~₹50–₹75** |
| Medium (Hyderabad) | 8–12 | ₹68–₹101 | **~₹105–₹155** |
| High (Chennai monsoon) | 15–20 | ₹127–₹169 | **~₹195–₹260** |

### Pricing Examples

| Worker | Zone | Forecast | Prior Claims | Final Premium |
|--------|------|----------|-------------|---------------|
| Rajan, South Chennai | High | Rain likely (monsoon) | None | ~₹190/week |
| Priya, Koramangala, Bengaluru | Low | Clear | None | ~₹65/week |
| Arif, Banjara Hills, Hyderabad | Medium | Hot, dry | 1 prior claim | ~₹140/week |

**For a worker earning ₹5,500/week, a ₹190 premium is 3.5% of weekly income — protecting against a 20–30% loss (₹1,100–₹1,650) in a single event.**

Target loss ratio: 65% — ₹65 of every ₹100 premium goes toward payouts; ₹35 covers operations, fraud reserves, and platform margin.

---

## ⚡ Parametric Triggers

Each trigger is a hard, objective threshold grounded in official Indian standards — IMD for weather, CPCB for air quality. If the API confirms the threshold was crossed in the worker's zone, the payout fires. No subjectivity, no worker input, no manual review.

| # | Trigger | Data Source | Official Standard | Threshold | Payout Hours |
|---|---------|-------------|------------------|-----------|-------------|
| 1 | 🌧️ Heavy Rainfall | OpenWeatherMap API | IMD "Heavy Rain" classification | ≥ 64.5 mm/day in zone | 4 hrs |
| 2 | 🌫️ Severe Air Quality | AQICN API | CPCB AQI "Very Poor" band | AQI > 300 (PM2.5) | 5 hrs |
| 3 | 🌡️ Heat Wave | OpenWeatherMap API | IMD Heat Wave definition for plains | Max temp ≥ 40°C in zone | 4 hrs |
| 4 | 🌊 Flood / Red Alert | IMD RSS Feed | IMD Red Warning — "Take Action" | Active Red Alert for zone | 8 hrs (full day) |
| 5 | 🚫 Curfew / Strike | Webhook / News API | Civil event confirmed by authority | Event active and verified in zone | 8 hrs (full day) |

### Official IMD Rainfall Classification (per 24 hours)

| IMD Category | Daily Rainfall | Our Trigger? |
|-------------|---------------|-------------|
| Light Rain | 2.5–7.5 mm | No — deliveries continue |
| Moderate Rain | 7.6–35.5 mm | No — slowed but not halted |
| Rather Heavy Rain | 35.6–64.4 mm | No — borderline, partial impact |
| **Heavy Rain** | **64.5–124.4 mm** | **✅ Yes — our primary trigger** |
| Very Heavy Rain | 124.5–244.4 mm | ✅ Yes — auto-triggered |
| Extremely Heavy Rain | ≥ 244.4 mm | ✅ Yes — full-day payout |

We trigger at **IMD "Heavy Rain" (≥ 64.5 mm/day)** — the threshold at which road flooding, near-zero visibility, and safety hazards effectively halt two-wheeler outdoor work across Indian cities. The IMD Hazard Atlas of India uses exactly this ≥ 64.5 mm/day boundary to define heavy, very heavy, and extremely heavy events.

### Official CPCB AQI Scale

| CPCB Category | AQI Range | Health Impact | Our Trigger? |
|--------------|-----------|---------------|-------------|
| Good | 0–50 | Minimal | No |
| Satisfactory | 51–100 | Minor discomfort | No |
| Moderate | 101–200 | Sensitive groups affected | No |
| Poor | 201–300 | Breathing discomfort for most | No |
| **Very Poor** | **301–400** | **Respiratory illness on prolonged outdoor exposure** | **✅ Yes** |
| Severe | 401–500 | Serious health risk for healthy individuals | ✅ Yes |

We trigger at **CPCB AQI > 300 ("Very Poor")** — the level at which health authorities explicitly advise against sustained outdoor physical activity.

### IMD Heat Wave Definition

IMD declares a Heat Wave when the maximum temperature reaches ≥ 40°C on plains AND departs from the climatological normal by ≥ 4.5°C. We trigger at **max temp ≥ 40°C** — the IMD-recognised entry threshold for heat wave conditions on plains.

### Fraud Guard on Triggers

- Payouts only fire when the reading is confirmed for the **worker's registered delivery zone**, not just the broader city
- The reading must fall **within the worker's active 7-day policy window**
- The worker's last app GPS and cell tower data must place them **within or adjacent to the disruption zone** at event time

---

## 🤖 AI/ML Integration Plan

GigShield AI uses machine learning at two points: **premium calculation** before policy purchase, and **fraud detection** before every payout.

---

### Module 1 — Dynamic Premium Calculation

**Where it runs:** ML Service (Python/Flask), called by Backend at policy purchase time
**Model:** XGBoost Regressor (Gradient Boosting)
**Response time target:** < 200ms

**Input Features:**

| Feature | Source | Type |
|---------|--------|------|
| Worker's delivery zone (lat/lng centroid) | User signup | Categorical |
| Zone's historical trigger event count (5-year IMD + AQICN) | Pre-processed dataset | Numerical |
| 7-day cumulative rain probability for zone | OpenWeatherMap Forecast API | Float 0–1 |
| 7-day average AQI forecast | AQICN API | Numerical |
| 7-day max temperature forecast | OpenWeatherMap Forecast API | Numerical |
| Worker's claim count (past 90 days) | PostgreSQL | Numerical |
| Worker's declared weekly income (₹) | User signup | Numerical |
| Month (captures monsoon seasonality) | Derived | Categorical |
| Day of week policy purchased | Derived | Categorical |

**Output:** `weekly_premium` in ₹ (float, clipped to ₹50 minimum)

**Training strategy:** 18 months of synthetic zone-weather-event-payout data generated using IMD historical records and AQICN archives trains the initial model. Once real policies are issued, the model retrains weekly on actual payout outcomes, improving zone risk estimates over time.

**User journey integration:**
```
Signup complete
  → Backend sends {zone, forecast features, claim history} to ML Service
  → XGBoost returns premium in < 200ms
  → Frontend displays: "Your weekly premium: ₹190"
  → Worker pays → Policy activated immediately
```

---

### Module 2 — Fraud Detection (Isolation Forest)

**Where it runs:** ML Service (Python/Flask), called before every payout
**Model:** Isolation Forest (unsupervised anomaly detection)

**Why Isolation Forest:** Fraud is an outlier by nature. Isolation Forest identifies outliers without requiring labelled fraud training data — which we won't have in Phase 1. A supervised Random Forest classifier will be layered on in Phase 3 as confirmed fraud cases accumulate.

**Features Scored Per Claim:**

| Feature | What It Detects |
|---------|----------------|
| Worker's claim frequency vs. zone average (past 30 days) | Unusually frequent claimers vs. zone peers |
| Time since policy purchase at first claim | Policies bought hours before a predicted storm — "storm chasers" |
| GPS zone at last app session vs. disruption zone | Registered in Zone 4, app active in Zone 9 during event |
| Device ID uniqueness across accounts | Multiple accounts on same physical device |
| Claimed payout vs. declared weekly income | Payout cannot exceed declared income |
| Duplicate event flag | Same disruption event → only one payout per worker |

**Output:** `fraud_score` (0–1 float) + `flag` boolean

**Routing:**
```
fraud_score < 0.30   →  Auto-approve — payout fires immediately
fraud_score 0.30–0.65 →  Soft flag — payout fires, logged for async review
fraud_score > 0.65   →  Hard hold — payout paused, manual review within 2 hours
```

---

## 🔒 Fraud Detection

Three hard rule-based guardrails apply on top of the ML model and cannot be overridden:

| Rule | Detail |
|------|--------|
| **Zone Lock** | Registered zone is fixed for 30 days from signup. Zone changes trigger a 7-day waiting period before new-zone coverage applies. |
| **Duplicate Event Block** | A single `disruption_event` record generates only one payout per worker per policy period, regardless of how many polling cycles the event spans. |
| **Income Cap** | Maximum payout in any 7-day window cannot exceed the worker's declared weekly income. Declarations are validated against the city-level average at signup. |

---

## 🛡️ Adversarial Defense & Anti-Spoofing Strategy

GPS verification alone is not enough. A bad actor with a ₹200 location-spoofing app can fake coordinates in seconds. This section details exactly how GigShield AI detects this — and why our architecture makes GPS spoofing both detectable and economically unattractive.

---

### 1. The Differentiation — Genuine Stranded Worker vs. GPS Spoofer

The core insight: **a real disruption leaves a coherent fingerprint across multiple independent signals simultaneously. A spoofer can fake one signal — they cannot fake all of them.**

When genuine heavy rainfall hits Zone 4 in Chennai, the following all change together:

- OpenWeatherMap confirms ≥ 64.5 mm accumulation for that zone
- Hundreds of other GigShield workers in that zone go quiet simultaneously — delivery activity drops naturally across the whole zone
- Network signal quality for devices in that zone degrades (cell tower congestion during heavy rain is measurable via response latency)
- The worker's device cell tower ID is physically within the disruption zone

A GPS spoofer sitting at home shows a completely different profile:

| Signal | Genuine Stranded Worker | GPS Spoofer |
|--------|------------------------|-------------|
| Device GPS matches disruption zone | Yes | Yes — faked |
| Weather API confirms event at zone | Yes | Yes — they pick a real event zone |
| Cell tower ID matches disruption zone | Yes | No — tower reveals real location |
| App session timing coherence | Consistently in Zone 4 for 2+ hours | Sudden zone jump with no travel time |
| Device motion / accelerometer | Stationary (parked bike) | May show indoor idle pattern |
| Peer behaviour in claimed zone | Other workers in Zone 4 also paused | Consistent (real event) |

**The ML differentiator is not any single signal — it is the coherence score across all signals simultaneously.**

#### Cell Tower Triangulation — The Key Defence

Android devices log cell tower IDs alongside GPS continuously. GigShield AI collects the anonymised network cell tower identifier (not the GPS coordinate) from the background app session. Cell towers cannot be spoofed by a location-mocking app — they require physical proximity. We cross-reference the last 3 tower IDs from the session against the tower coverage map for the claimed disruption zone.

```
Cell tower ID within disruption zone  →  coherence confirmed
Cell tower ID outside disruption zone →  spoofing flag raised
```

This single check eliminates the vast majority of naive GPS spoofing attempts.

---

### 2. The Data — What We Analyse Beyond GPS to Detect Coordinated Fraud Rings

A coordinated fraud ring is harder to catch at the individual claim level — each claim may look plausible in isolation. We detect rings by looking for patterns across the entire claim population.

**Data points collected beyond GPS:**

| Signal | How Collected | What It Reveals |
|--------|--------------|-----------------|
| **Device fingerprint** | Android device ID + screen resolution + build model hash | Multiple accounts on one physical device |
| **Cell tower sequence** | Background session logs — last 5 tower IDs | Physical location regardless of GPS app |
| **Registration metadata** | Signup timestamp, IP address, referral source | Batch registrations from same IP in rapid sequence = coordinated ring staging |
| **UPI account linkage** | Payment destination | Multiple worker accounts routing payouts to the same UPI ID or bank |
| **Claim timestamp clustering** | Millisecond-precision initiation time | Scripted simultaneous claims show unnaturally tight clustering (< 500ms across accounts) |
| **App session behaviour** | Screen dwell time, tap patterns, scroll velocity | Bots or scripted sessions show inhuman interaction patterns |
| **Incentive history** | Order volume from past weeks (user-declared at signup) | A worker claiming full-day income loss who had zero orders in the previous 3 weeks has no credible income to protect |
| **Zone registration clustering** | New signups per zone per day | Sudden spike of 50 new signups in one micro-zone the day before a predicted storm = pre-fraud staging |

**Graph-level ring detection (Phase 3):**

Beyond per-claim features, we build a bipartite graph connecting workers, devices, and UPI accounts. Fraud rings appear as densely connected subgraphs. Any node (device or UPI) connected to more than 2 worker accounts is automatically escalated regardless of individual claim scores.

```
Normal:     Worker A ── Device 1 ── UPI-A

Fraud ring: Worker A ─┐
            Worker B ─┤── Device 1 ── UPI-X
            Worker C ─┤
            Worker D ─┘── Device 2 ── UPI-X
```

---

### 3. The UX Balance — Flagged Claims Without Penalising Honest Workers

**A worker sheltering from a storm who experiences a network drop must never be treated the same as a fraudster.** Our design principle: the burden of suspicion must never land on the worker.

#### The Four-Path Routing System

```
Fraud Score + Flag Reason
        │
        ├── Score < 0.30  ────────────────────────────► AUTO-PAY
        │                                               Payout in minutes, no friction
        │
        ├── Score 0.30–0.65 + reason = NETWORK_WEAK ──► GRACE-PAY
        │                                               Payout fires immediately
        │                                               Async internal review, zero worker friction
        │
        ├── Score 0.30–0.65 + reason = ZONE_MISMATCH ─► SOFT-HOLD
        │                                               Worker notified within 15 min
        │                                               One-tap self-resolution
        │                                               Auto-releases in 2 hours
        │
        └── Score > 0.65  ────────────────────────────► HARD-HOLD
                                                        Manual review within 2 hours
                                                        Worker notified with clear reason
```

#### The Grace-Pay Path — Critical for Honest Workers

When a claim is flagged **solely because of weak network signal or GPS inconsistency** — not because of device or behavioural anomalies — the system applies Grace-Pay:

- Payout fires immediately — the worker receives their money
- Claim is logged for async internal review within 24 hours
- If confirmed legitimate (the overwhelming majority of weather-driven signal drops), no action is taken
- If confirmed fraud on review, account is flagged and future payouts are held

**Why this is the right design:** A real storm causes exactly the conditions that produce false positives — weak GPS signal, network congestion, app session gaps. Holding payout every time signal drops during a storm would systematically delay payouts to the workers who need them most, at the exact moment they need them. Grace-Pay inverts the risk: pay first, verify after.

#### The Soft-Hold Path — One-Tap Resolution

When zone mismatch is detected (cell tower outside claimed zone), the app prompts:

> *"We noticed your location signal was unclear during the disruption. Tap to confirm you were working in Zone 4."*

One tap — combined with the cell tower re-resolving as the worker moves back into coverage — closes 90%+ of soft-hold cases automatically within 30–45 minutes. The payout fires with no further action from the worker.

#### What Workers See

| Situation | Worker-Facing Message | Internal Action |
|-----------|----------------------|-----------------|
| Auto-pay | "₹352 transferred to your UPI. Stay safe." | Fraud score logged |
| Grace-pay (signal drop) | "₹352 transferred to your UPI. Stay safe." | Async review queued |
| Soft-hold (zone mismatch) | "Confirming your location — payout in ~30 min." | ML re-scores with fresh cell data |
| Hard hold | "We're verifying your claim — you'll hear from us in 2 hours." | Manual review initiated |
| Confirmed fraud | "Your account has been paused. Contact support." | Account flagged, policy voided |

The word "fraud" never appears in any message to the first four categories. Honest workers experience minimal to zero delay.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14, TypeScript | Mobile-first PWA — onboarding, policy purchase, payout history |
| Backend | Node.js, Express, TypeScript | Core API, Trigger Monitor cron, business logic, DB management |
| ML Service | Python 3.9+, Flask, XGBoost, Scikit-learn | Premium calculation (XGBoost), fraud scoring (Isolation Forest) |
| Database | PostgreSQL | Workers, policies, disruption events, claims, payouts |
| Payments | Razorpay (Sandbox / Test mode) | UPI payout simulation |
| Deployment | Docker, Docker Compose | All services containerised — `docker-compose up --build` |
| Weather | OpenWeatherMap API (free tier) | Hourly rainfall accumulation, max temp, 7-day forecasts |
| Air Quality | AQICN API (free tier) | Real-time AQI by city and zone |
| Flood Alerts | IMD RSS Feed (public) | Official Red/Orange weather alerts |
| Civil Events | Mock Webhook (internal) | Simulated curfew and strike triggers for demo |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       EXTERNAL APIs                          │
│   OpenWeatherMap    AQICN    IMD RSS Feed    Razorpay        │
└────────┬──────────────┬──────────┬──────────────┬───────────┘
         │  polls every │          │              │
         │  15 minutes  │          │   payout API (bidirectional)
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

All inter-service communication is REST over HTTP. The Trigger Monitor is a cron job internal to the Backend — it does not expose an external endpoint. All four services are containerised and orchestrated via Docker Compose.

---

## 📅 Development Plan

### Phase 1 — Seed (March 4–20) ← Current

- [x] Problem definition with verified gig worker income data (TeamLease, Zomato/Swiggy disclosures)
- [x] Persona development with real-world scenario walkthroughs
- [x] Parametric triggers calibrated to IMD and CPCB official standards
- [x] Premium formula with actuarial loss ratio logic
- [x] ML model design — inputs, algorithms, integration points
- [x] Adversarial defense and anti-spoofing strategy
- [x] System architecture design
- [x] Figma prototype (8 screens)
- [ ] 2-minute strategy video → paste link above in place of `[Watch here](#)`

### Phase 2 — Scale (March 21–April 4)

- [ ] PostgreSQL schema — `workers`, `policies`, `disruption_events`, `claims`, `payouts`
- [ ] Backend REST API — registration, policy CRUD, premium endpoint, trigger monitor
- [ ] ML Service — XGBoost premium model trained on IMD-calibrated synthetic data
- [ ] Trigger Monitor — live polling of OpenWeatherMap + AQICN against official thresholds
- [ ] Razorpay sandbox integration — end-to-end payout flow
- [ ] Frontend — onboarding (3 steps), policy purchase, active dashboard
- [ ] 2-minute demo video

### Phase 3 — Soar (April 5–17)

- [ ] Isolation Forest fraud model integrated pre-payout
- [ ] Cell tower zone validation — cross-reference with disruption zone coverage map
- [ ] Graph-based fraud ring detection — bipartite worker-device-UPI graph
- [ ] Admin dashboard — loss ratio tracker, disruption heatmap, manual review queue
- [ ] Worker dashboard — payout history, active coverage status, live zone conditions
- [ ] Simulated disruption demo — trigger synthetic heavy rain event, show full auto-payout
- [ ] Final 5-minute walkthrough video (required: simulated disruption → auto-claim → payout)
- [ ] Pitch deck PDF — persona, AI architecture, weekly premium business viability

---

## 🚀 Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **H3 Geospatial Indexing** | Replace city-level zones with Uber's hexagonal grid (H3) for sub-kilometre precision — prevents payouts to workers in adjacent unaffected areas |
| **RL Premium Engine** | Self-tuning reinforcement learning model that learns the optimal weekly price to maximise worker adoption while keeping the loss ratio sustainable |
| **Graph Neural Network Fraud** | Full graph neural network on the worker-device-UPI graph to surface coordinated fraud rings invisible to per-claim anomaly scoring |
| **Causal Inference Validation** | Verify that a worker's income loss was caused by the disruption — not just coincidentally timed with it (workers offline for other reasons should not receive payouts) |
| **Platform API Integration** | Direct Swiggy/Zomato partner API integration to verify active delivery status during disruption windows |
| **Smart Contract Execution** | Encode policy terms on Polygon blockchain — tamper-proof, trustless automatic payouts independent of GigShield's servers |
| **Multi-language UI** | Full support for Tamil, Telugu, Hindi, and Kannada — not just English |
| **GRAP-linked AQI Triggers** | Tie AQI triggers to Delhi's Graded Response Action Plan (GRAP) stages for more legally defensible event definitions |

---

> **Built for Guidewire DEVTrails 2026 · In partnership with EY & NIA**
>
> *Protecting India's 15+ lakh delivery partners — one parametric trigger at a time.*
>
> Target: DEVSummit Bangalore · May 2026 · Prize Pool: ₹6,00,000
