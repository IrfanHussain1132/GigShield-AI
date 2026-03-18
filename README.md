# GigShield AI

AI-Powered Parametric Insurance for Food Delivery Partners.

## Table of Contents
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Target Users](#target-users)
- [Workflow](#workflow)
- [Compensation Model](#compensation-model)
- [Weekly Premium Model](#weekly-premium-model)
- [Parametric Triggers](#parametric-triggers)
- [AI Features](#ai-features)
- [APIs Used](#apis-used)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Dashboard](#dashboard)
- [Platform](#platform)
- [Future Enhancements](#future-enhancements)

## Problem Statement
Food delivery partners face income loss due to:
- Weather conditions
- Pollution
- Social disruptions (curfews, strikes)

They currently have little to no financial protection against these unpredictable events.

## Solution
GigShield AI provides **automatic compensation** for income loss using AI and real-time APIs.
- No manual claims required
- Disruptions detected automatically
- Payouts triggered instantly

## Target Users
- Swiggy / Zomato delivery partners
- Urban & semi-urban gig workers
- Workers earning weekly income

## Workflow
1. User signs up and provides location & income
2. AI calculates risk score & weekly premium
3. System monitors weather, maps, and news APIs
4. Disruption detected automatically
5. Income loss calculated
6. Instant payout triggered

## Compensation Model
**Compensation = Avg Hourly Income × Hours Lost**

## Weekly Premium Model
Premium is calculated weekly based on risk level, location, and expected disruptions.

Example:
- Weekly Income: ₹5000
- Premium: ₹100/week

## Parametric Triggers
| Type | Condition | Impact |
|------|----------|--------|
| Rain | > 50mm | Delivery slowdown |
| Heat | > 42°C | Unsafe working |
| Pollution | AQI > 300 | Reduced work |
| Social | Curfew / Strike | No deliveries |

## AI Features
- Risk prediction model
- Dynamic premium calculation
- Fraud detection (location + behavior)

## APIs Used
- OpenWeatherMap (Weather API)
- Google Maps API
- News API
- Air Quality API (optional)

## Tech Stack
- **Frontend:** React.js (Mobile-first UI)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL / MongoDB
- **AI/ML Service:** Python (Flask + Scikit-learn)
- **Payments:** Razorpay
- **Deployment:** Docker (Microservices)

## System Architecture
GigShield AI uses a **microservices architecture** where each service runs independently and communicates through APIs.

Services:
- **Frontend:** UI and dashboard
- **Backend:** Core logic, trigger monitoring, API handling
- **ML Service:** Risk scoring and fraud detection
- **Database:** Users, policies, claims
- **External APIs:** Weather, Maps, News

**Flow:** APIs → Backend → ML Service → Database → Payout

## Dashboard
Tracks:
- Active users
- Premium collected
- Claims triggered
- Payouts processed

## Platform
Mobile-first application for delivery partners.

## Future Enhancements
- Heatwave prediction
- Risk alerts
- Platform integrations

---
© 2026 GigShield AI | Built for Gig Workers