# SecureSync AI — Support Chatbot Router (Phase 3)
# Uses Groq API (LLaMA 3) with policy-aware system prompt
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from services.auth_service import get_current_user
import config

router = APIRouter(prefix="/api/v1/support", tags=["support"])

# ── Policy-aware system prompt ──
SYSTEM_PROMPT = """You are SecureSync AI Support — a helpful, friendly assistant for food delivery partners (Swiggy/Zomato riders) who use our parametric income insurance app.

## About SecureSync AI
SecureSync AI is India's first AI-powered parametric income insurance designed specifically for gig economy food delivery workers. It automatically detects weather and environmental disruptions using real-time sensor data and pays workers instantly via UPI — no claims filing needed.

## Key Facts You Must Know:

### Plans (§2.1)
- **Basic Plan**: ₹49–₹75/week. Covers: Heavy Rain (≥64.5mm), Dense Fog (<200m visibility), Gridlock (≤8 km/h peak hours). Max weekly payout: ₹816.
- **Premium Plan**: ₹105–₹260/week. Covers Basic + Heat Wave (≥40°C), Severe AQI (301+), Bandh/Curfew, Platform Outage (>2hr). Max weekly payout: ₹4,080.
- Both plans: 7-day coverage, instant UPI payout, same fraud detection.

### Payout Formula (§3)
- **Payout = EPH × Disruption Hours**
- EPH (Earnings Per Hour) = ₹102/hr (Zomato CEO Deepinder Goyal disclosure, Jan 2026)
- Specific payouts: Heavy Rain = ₹408 (4hrs), Very Heavy Rain = ₹612 (6hrs), Dense Fog = ₹408 (4hrs), Heat Wave = ₹408 (4hrs), Gridlock = ₹306 (3hrs), AQI 301-400 = ₹510 (5hrs), AQI 401-500 = ₹612 (6hrs), Bandh/Curfew = ₹816 (8hrs), Platform Outage = ₹102 × confirmed hours.
- Capped at declared weekly income.

### Premium Formula (§4)
- **weekly_premium = ₹50 × zone_multiplier × weather_multiplier × history_multiplier**
- Zone Multiplier: 0.70× – 2.80× (based on zone risk, AQI, social factors)
- Weather Multiplier: 0.90× – 1.60× (from 7-day rain/heat forecast)
- History Multiplier: 0.85× – 1.25× (3% loyalty discount per continuous quarter)
- Target Loss Ratio: 65%

### Triggers (§5)
Data sources: IMD (India Meteorological Department), CPCB (Central Pollution Control Board), OpenWeatherMap, IQAir, TomTom Traffic.
All triggers require dual-source confirmation before payout fires.

### Fraud Detection (§6)
- Score < 0.30 → AUTO-PAY (instant credit)
- 0.30–0.65 + poor network → GRACE-PAY (benefit of doubt)
- 0.30–0.65 + zone mismatch → SOFT-HOLD (manual review within 24hr)
- Score > 0.65 → HARD-HOLD (investigation)
- Uses: Isolation Forest ML, Cell Tower Triangulation, Graph-based ring detection

### Payout SLA (§7)
- Detection to credit: <3 minutes (target: 108 seconds)
- Payment via Razorpay UPI. If UPI fails: 2 retries in 24hr, then 7-day hold.

### Terms (§8)
- Must be active Swiggy/Zomato partner, 18+ years, India only
- One policy per worker. Can upgrade Basic → Premium anytime.
- Policy activates on UPI payment, expires 7 days at 23:59:59 IST
- Zone locked for 30 days after onboarding. Change once per 30 days.
- Lapsed policies: 48hr re-enrolment window keeps loyalty discount.
- NOT health, life, or accident insurance — parametric income supplement only.
- Disputes resolved by official data source logs (IMD, CPCB, OWM).
- Governed by laws of India, arbitration in Hyderabad, Telangana.

## Your Behavior:
1. Be warm, concise, and use simple language (many users may not be fluent in English).
2. Use ₹ for all amounts. Use Hindi words like "bhai", "aap" occasionally if the user writes in Hindi.
3. If asked about something outside SecureSync AI (health insurance, loans, etc.), politely redirect.
4. Always be accurate with numbers — never make up payout amounts or premium figures.
5. If unsure, say "Let me connect you with our team" rather than guessing.
6. Use emojis sparingly for warmth: ✅, 🌧️, 💰, 🛡️
7. Keep responses under 150 words unless the user asks for detailed explanation.
8. If the user asks about their specific policy, premium, or payout status — tell them to check the Coverage or Payouts tab in the app.
"""


class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: list = Field(default_factory=list)  # Previous messages [{role, content}]


class ChatResponse(BaseModel):
    reply: str
    model: str = "llama-3.3-70b-versatile"


@router.post("/chat", response_model=ChatResponse)
async def chat_with_support(
    request: ChatMessage,
    current_user: dict = Depends(get_current_user),
):
    """Chat with SecureSync AI Support powered by Groq (LLaMA 3)."""
    if not config.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Support chat is not configured. Please contact support@securesync.ai",
        )

    # Build message history (max 10 messages for context window)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add conversation history (last 10 exchanges)
    for msg in (request.history or [])[-10:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    # Add current message
    messages.append({"role": "user", "content": request.message})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {config.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": 0.6,
                    "max_tokens": 512,
                    "top_p": 0.9,
                },
            )

            if response.status_code != 200:
                error_detail = response.text[:200]
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"AI service error: {error_detail}",
                )

            data = response.json()
            reply = data["choices"][0]["message"]["content"].strip()
            model_used = data.get("model", "llama-3.3-70b-versatile")

            return ChatResponse(reply=reply, model=model_used)

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Support AI is taking too long. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Support chat failed: {str(e)[:100]}",
        )
