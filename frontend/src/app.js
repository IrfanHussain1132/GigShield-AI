// ============================
// SecureSync AI — PWA App Core (Modularized)
// ============================
import { onboardingScreen, loginScreen, otpScreen } from './screens/onboarding.js';
import { verificationStartScreen, verificationScoreScreen } from './screens/verification.js';
import { premiumScreen, upiScreen, confirmationScreen } from './screens/purchase.js';
import { homeScreen, coverageScreen, liveZoneScreen, payoutsScreen, payoutCelebrationScreen, accountScreen } from './screens/dashboard.js';
import { api, clearApiCache } from './utils/api.js';
import { state } from './store.js';
import { t, supportedLanguages } from './utils/i18n.js';

const ONBOARDING_SLIDE_COUNT = 3;
let appBootstrapped = false;
let _navInFlight = false; // Prevent double-navigation
let _lastNavTime = 0;

function createIdempotencyKey(prefix = 'idem') {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

// --- Router ---
const router = {
  navigate(screen) {
    // Debounce: prevent rapid re-navigations that cause lag
    const now = Date.now();
    if (screen === state.screen && (now - _lastNavTime) < 300) return;
    _lastNavTime = now;
    state.screen = screen;
    const container = document.getElementById('screen-container');
    if (!container) return;
    const renderFn = screens[screen];
    if (!renderFn) { console.error('Unknown screen:', screen); return; }
    
    // Apply font-family and lang attribute
    const currentLang = supportedLanguages.find(l => l.code === (state.language || 'en'));
    document.body.style.fontFamily = currentLang ? `'${currentLang.font}', sans-serif` : 'var(--font-sans)';
    document.documentElement.lang = state.language || 'en';

    container.innerHTML = renderFn(state);

    requestAnimationFrame(() => {
      container.classList.remove('screen-enter');
      void container.offsetWidth; // force reflow
      container.classList.add('screen-enter');
      container.scrollTop = 0;
    });

    // SPA background cleanup
    if (state.otpInterval) {
      clearInterval(state.otpInterval);
      state.otpInterval = null;
    }

    const navScreens = ['home','coverage','payouts','account','live_zone'];
    const nav = document.getElementById('bottom-nav');
    if (nav) {
      if (navScreens.includes(screen)) {
        nav.style.display = 'flex';
        container.style.paddingBottom = 'calc(72px + env(safe-area-inset-bottom, 0px))';
        nav.querySelectorAll('.nav-item').forEach(item => {
          const key = item.dataset.nav;
          const isActive = key === screen || (screen === 'live_zone' && key === 'coverage');
          item.classList.toggle('active', isActive);
          if (isActive) item.setAttribute('aria-current', 'page');
          else item.removeAttribute('aria-current');
          
          // Language support for nav text
          const span = item.querySelector('span:not(.material-symbols-outlined)');
          if (span && key) {
            span.textContent = t(key) || key.charAt(0)?.toUpperCase() + key.slice(1);
          }
        });
      } else {
        nav.style.display = 'none';
        container.style.paddingBottom = '0px';
      }
    }

    if (screen === 'otp') actions.startOtpTimer();
    if (screen === 'onboarding') actions.initOnboarding();
  }
};

// --- Actions ---
const actions = {
  updateOnboardingDots() {
    const dots = document.querySelectorAll('.onb-dot');
    const activeIndex = Math.max(0, Math.min(state.slideIndex, dots.length - 1));
    dots.forEach((dot, index) => {
      dot.style.width = index === activeIndex ? '24px' : '8px';
      dot.style.background = index === activeIndex ? 'var(--color-primary)' : 'var(--color-outline-variant)';
    });
  },

  goToSlide(index, behavior = 'smooth') {
    const slider = document.getElementById('onb-slider');
    if (!slider) return;
    const slides = Array.from(slider.querySelectorAll(':scope > section'));
    const clampedIndex = Math.max(0, Math.min(index, slides.length - 1));
    state.slideIndex = clampedIndex;
    const targetSlide = slides[clampedIndex];
    if (targetSlide) {
      slider.scrollTo({ left: targetSlide.offsetLeft, behavior });
    }
    actions.updateOnboardingDots();
  },

  initOnboarding() {
    const slider = document.getElementById('onb-slider');
    const dots = document.querySelectorAll('.onb-dot');
    if (!slider || !dots.length) return;
    state.slideIndex = 0;
    actions.updateOnboardingDots();
    slider.scrollTo({ left: 0, behavior: 'auto' });

    slider.addEventListener('scroll', () => {
        const currentLeft = slider.scrollLeft;
        const width = slider.clientWidth || 1;
        const closestIndex = Math.round(currentLeft / width);
        if (closestIndex !== state.slideIndex) {
            state.slideIndex = closestIndex;
            actions.updateOnboardingDots();
        }
    }, { passive: true });
  },

  goToLogin() { router.navigate('verification_start'); },

  async login() {
    const input = document.getElementById('mobile');
    if (input) state.phone = input.value;
    if (state.phone.length < 10) { alert('Enter a valid 10-digit number'); return; }

    try {
      const res = await api('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: state.phone, phone_number: state.phone })
      }, state);
      
      console.log("OTP request sent via backend API.");
      if (res?.debug_code) console.log("Debug OTP:", res.debug_code);
      
      router.navigate('otp');
      
      // Auto-fill mock code if enabled and exists
      if (state.phase2MockOtpEnabled && state.phase2MockOtpCode && state.phase2MockOtpCode !== '000000') {
         setTimeout(() => {
             const codeArr = state.phase2MockOtpCode.split('').slice(0,6);
             codeArr.forEach((digit, i) => {
                actions.handleOtpInput(i, digit);
             });
         }, 500);
      }
    } catch (e) {
      console.error(e);
      alert('Could not send OTP. ' + (e.detail || 'Try again shortly.'));
    }
  },

  startOtpTimer() {
    state.otpTimer = 114;
    if (state.otpInterval) clearInterval(state.otpInterval);
    const update = () => {
      const el = document.getElementById('otp-timer');
      if (el) {
        const m = String(Math.floor(state.otpTimer / 60)).padStart(2, '0');
        const s = String(state.otpTimer % 60).padStart(2, '0');
        el.textContent = `${m}:${s}`;
      }
    };
    update();
    state.otpInterval = setInterval(() => {
      state.otpTimer--;
      if (state.otpTimer <= 0) { clearInterval(state.otpInterval); state.otpTimer = 0; }
      update();
    }, 1000);
  },

  handleOtpInput(index, value) {
    const digit = String(value || '').replace(/\D/g, '').slice(-1);
    state.otp[index] = digit;
    const current = document.getElementById('otp-' + index);
    if (current && current.value !== digit) current.value = digit;
    if (digit && index < 5) {
      const next = document.getElementById('otp-' + (index + 1));
      if (next) next.focus();
    }
    if (state.otp.every(d => /^\d$/.test(d))) actions.verifyOtp();
  },

  handleOtpKeydown(index, e) {
    if (e.key === 'Backspace' && !state.otp[index] && index > 0) {
      const prev = document.getElementById('otp-' + (index - 1));
      if (prev) { prev.focus(); state.otp[index-1] = ''; prev.value = ''; }
    }
  },

  async verifyOtp() {
    const code = state.otp.join('');

    try {
      const res = await api('/auth/verify-otp', {
        method: 'POST',
        throwOnError: true,
        body: JSON.stringify({ 
          phone: state.phone, 
          phone_number: state.phone, 
          otp: code,
          code: code
        }),
      }, state);
      
      if (res?.token) {
        state.token = res.token;
        window.localStorage.setItem('securesync_token', res.token);
        router.navigate('verification_start');
      }
    } catch (e) {
      console.error(e);
      alert('Invalid OTP or Backend failure. Try again.');
    } finally {
      if (state.otpInterval) { clearInterval(state.otpInterval); state.otpInterval = null; }
      state.otp = ['', '', '', '', '', ''];
    }
  },

  selectPlatform(plat) {
    state.platform = plat;
    if (state.screen === 'verification_start') {
      const container = document.getElementById('screen-container');
      if (container) container.innerHTML = screens.verification_start(state);
    } else {
      router.navigate('verification_start');
    }
  },

  prefillPartnerId(partnerId) {
    state.partnerId = String(partnerId || '').trim();
    const input = document.getElementById('partner-id-input');
    if (!input) return;
    input.value = state.partnerId;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  },

  async verifyPartner() {
    const input = document.getElementById('partner-id-input');
    if (input) state.partnerId = input.value.trim();

    if (!state.partnerId) {
      alert('Please enter a valid Partner ID first.');
      return;
    }

    // Admin shortcut — bypass normal verification
    if (state.partnerId.toLowerCase() === 'admin1234') {
      window.location.href = '/admin.html';
      return;
    }

    // Local mock lookup (matches seed_data.py MOCK_PARTNERS)
    // This lets the app work without a backend auth token
    const MOCK_PARTNERS = {
      'SW-982341': { name:'Rajan Kumar',     zone:'Zone 4', city:'South Chennai',   score:92, hourly_rate:102, weekly_income:6120,  status:'ACTIVE' },
      'ZM-112233': { name:'Suresh Babu',      zone:'Zone 1', city:'Central Chennai', score:78, hourly_rate:98,  weekly_income:5880,  status:'ACTIVE' },
      'SW-223344': { name:'Arun Kumar',        zone:'Zone 4', city:'South Chennai',   score:85, hourly_rate:100, weekly_income:6000,  status:'ACTIVE' },
      'ZM-998877': { name:'Bala Subramanian', zone:'Zone 1', city:'Central Chennai', score:96, hourly_rate:115, weekly_income:6900,  status:'ACTIVE' },
      'ZM-445521': { name:'Amit Verma',       zone:'Zone 2', city:'Hyderabad',       score:85, hourly_rate:100, weekly_income:6000,  status:'ACTIVE' },
      'SW-667788': { name:'Priya Reddy',      zone:'Zone 2', city:'Hyderabad',       score:88, hourly_rate:105, weekly_income:6300,  status:'ACTIVE' },
      'SW-776655': { name:'Rahul Rao',        zone:'Zone 2', city:'Hyderabad',       score:74, hourly_rate:92,  weekly_income:5520,  status:'ACTIVE' },
      'SW-334455': { name:'Vikram Singh',     zone:'Zone 3', city:'Delhi',           score:94, hourly_rate:110, weekly_income:6600,  status:'ACTIVE' },
      'ZM-556677': { name:'Rakesh Sharma',    zone:'Zone 3', city:'Delhi',           score:72, hourly_rate:95,  weekly_income:5700,  status:'ACTIVE' },
      'ZM-123456': { name:'Sandeep Kumar',    zone:'Zone 3', city:'Delhi',           score:89, hourly_rate:105, weekly_income:6300,  status:'ACTIVE' },
      'SW-889900': { name:'Deepak Patil',     zone:'Zone 5', city:'Mumbai',          score:90, hourly_rate:108, weekly_income:6480,  status:'ACTIVE' },
      'ZM-101112': { name:'Farhan Sheikh',    zone:'Zone 5', city:'Mumbai',          score:80, hourly_rate:100, weekly_income:6000,  status:'ACTIVE' },
      'SW-556644': { name:'Prasad More',      zone:'Zone 5', city:'Mumbai',          score:84, hourly_rate:102, weekly_income:6120,  status:'ACTIVE' },
      'SW-131415': { name:'Karthik Gowda',   zone:'Zone 6', city:'Bengaluru',       score:83, hourly_rate:104, weekly_income:6240,  status:'ACTIVE' },
      'ZM-161718': { name:'Naveen Kumar',     zone:'Zone 6', city:'Bengaluru',       score:87, hourly_rate:102, weekly_income:6120,  status:'ACTIVE' },
      'ZM-202122': { name:'Vishnu Murthy',    zone:'Zone 6', city:'Bengaluru',       score:75, hourly_rate:94,  weekly_income:5640,  status:'ACTIVE' },
      'SW-303132': { name:'Siddharth J',      zone:'Zone 6', city:'Bengaluru',       score:97, hourly_rate:112, weekly_income:6720,  status:'ACTIVE' },
    };

    const mockMatch = MOCK_PARTNERS[state.partnerId.toUpperCase()];
    if (mockMatch) {
      Object.assign(state.user, {
        name: mockMatch.name,
        zone: mockMatch.zone,
        city: mockMatch.city,
        score: mockMatch.score,
        hourlyRate: mockMatch.hourly_rate,
        weeklyIncome: mockMatch.weekly_income,
        workerId: state.partnerId.toUpperCase(),
      });
      router.navigate('verification_score');
      return;
    }

    // Fallback: try backend API (requires token)
    try {
      const res = await api('/workers/verify', {
        method: 'POST',
        throwOnError: true,
        body: JSON.stringify({ partner_id: state.partnerId, platform: state.platform || 'swiggy' }),
      }, state);
      if (res?.status === 'ACTIVE') {
        Object.assign(state.user, {
            name: res.name, zone: res.zone, city: res.city, score: res.score,
            hourlyRate: res.hourly_rate, weeklyIncome: res.weekly_income, workerId: res.worker_id
        });
        router.navigate('verification_score');
      }
    } catch (e) {
      // If unknown ID and backend also fails, give a clear message
      alert(e.detail || 'Partner ID not found. Please check and try again.');
    }
  },

  async goToPremium() {
    // Mock premium quotes — no token needed
    const score = state.user.score || 82;
    const discount = score >= 90 ? 3 : score >= 80 ? 2 : 0;
    state.premiumQuotes = {
      basic: {
        final_premium: Math.max(20, 25 - discount),
        adjustments: [
          { label: 'Rain Risk (Mon–Wed)', value: 1.20, icon: 'rainy' },
          { label: 'Heat Warning Peak',   value: 0.40, icon: 'light_mode' },
          { label: 'Zone Risk Factor',    value: -1.10, icon: 'distance' },
          { label: 'Clean Claim History', value: -0.20, icon: 'history' },
          { label: 'Safety Score Reward', value: -2.50, icon: 'insights' },
        ]
      },
      premium: {
        final_premium: Math.max(40, 47 - discount),
        adjustments: [
          { label: 'Rain Risk (Mon–Wed)',  value: 5.20, icon: 'rainy' },
          { label: 'Heat Warning Peak',    value: 2.40, icon: 'light_mode' },
          { label: 'Zone Risk Factor',     value: -3.10, icon: 'distance' },
          { label: 'Clean Claim History',  value: -0.80, icon: 'history' },
          { label: 'Driver Score Reward',  value: -12.50, icon: 'insights' },
        ]
      }
    };
    actions.selectTier(state.tier);
  },

  selectTier(t) {
    state.tier = t;
    const quote = state.premiumQuotes[t];
    if (quote) {
      state.premiumAmount = quote.final_premium;
      state.premiumBreakdown = quote;
    }
    if (state.screen === 'premium') {
        document.getElementById('screen-container').innerHTML = premiumScreen(state);
    } else {
        router.navigate('premium');
    }
  },

  buyPolicy() { router.navigate('upi'); },

  async activateCoverage() {
    if (state.purchaseInFlight) return;
    state.purchaseInFlight = true;
    // Mock policy purchase — bypass 401
    await new Promise(r => setTimeout(r, 900));
    const now = new Date();
    const diffToMonday = (now.getDay() === 0 ? -6 : 1) - now.getDay();
    const start = new Date(now); start.setDate(now.getDate() + (diffToMonday <= 0 ? diffToMonday + 7 : diffToMonday));
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' }).replace(',','');
    state.policy = {
      status: 'success',
      policy_id: `SS-${Math.floor(Math.random()*9000)+1000}-IND`,
      tier: state.tier === 'premium' ? 'Premium' : 'Basic',
      startDate: fmt(start),
      endDate: fmt(end),
      maxPayout: state.tier === 'premium' ? 4080 : 816,
    };
    state.purchaseInFlight = false;
    router.navigate('confirmation');
  },

  async goToDashboard() {
    if (_navInFlight) return;
    _navInFlight = true;

    // ── 30-day weather trigger schedule (mock) ──
    // Each entry: { date, trigger, rain_mm, aqi, temp_c, payout }
    const now = new Date();
    const TRIGGER_SCHEDULE = [
      { daysAhead:0,  trigger:'Heavy Rain',      rain_mm:72.4,  aqi:88,  temp_c:29, visibility_km:2.1, payout:408 },
      { daysAhead:2,  trigger:'AQI Danger',       rain_mm:4.2,   aqi:342, temp_c:34, visibility_km:5.0, payout:510 },
      { daysAhead:4,  trigger:'Heat Wave',        rain_mm:0,     aqi:95,  temp_c:42, visibility_km:8.0, payout:408 },
      { daysAhead:6,  trigger:'Very Heavy Rain',  rain_mm:138.6, aqi:72,  temp_c:27, visibility_km:1.2, payout:612 },
      { daysAhead:9,  trigger:'Dense Fog',        rain_mm:1.0,   aqi:110, temp_c:22, visibility_km:0.09,payout:408 },
      { daysAhead:11, trigger:'Heavy Rain',       rain_mm:68.1,  aqi:80,  temp_c:28, visibility_km:2.8, payout:408 },
      { daysAhead:13, trigger:'Gridlock',         rain_mm:6.2,   aqi:145, temp_c:33, visibility_km:6.0, payout:306 },
      { daysAhead:16, trigger:'AQI Danger',       rain_mm:2.1,   aqi:389, temp_c:36, visibility_km:4.5, payout:510 },
      { daysAhead:18, trigger:'Very Heavy Rain',  rain_mm:152.3, aqi:65,  temp_c:26, visibility_km:0.8, payout:612 },
      { daysAhead:21, trigger:'Heat Wave',        rain_mm:0,     aqi:88,  temp_c:43, visibility_km:9.0, payout:408 },
      { daysAhead:23, trigger:'Heavy Rain',       rain_mm:79.5,  aqi:91,  temp_c:28, visibility_km:2.0, payout:408 },
      { daysAhead:25, trigger:'Dense Fog',        rain_mm:0.5,   aqi:122, temp_c:21, visibility_km:0.07,payout:408 },
      { daysAhead:27, trigger:'Gridlock',         rain_mm:8.4,   aqi:160, temp_c:32, visibility_km:5.5, payout:306 },
      { daysAhead:29, trigger:'Very Heavy Rain',  rain_mm:145.0, aqi:70,  temp_c:25, visibility_km:1.0, payout:612 },
    ];
    state.triggerSchedule = TRIGGER_SCHEDULE.map(t => {
      const d = new Date(now); d.setDate(now.getDate() + t.daysAhead);
      return { ...t, date: d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) };
    });

    // Today's weather = first upcoming trigger entry
    const todayTrigger = TRIGGER_SCHEDULE[0];
    const zone = state.user.zone || 'Zone 4';

    state.weather = {
      rain_mm:        todayTrigger.rain_mm,
      aqi:            todayTrigger.aqi,
      temp_c:         todayTrigger.temp_c,
      visibility_km:  todayTrigger.visibility_km,
      wind_kmh:       18,
      zone,
    };
    state.dashboard = {
      has_active_policy:  Boolean(state.policy),
      today_earnings:     todayTrigger.payout,
      month_total:        TRIGGER_SCHEDULE.slice(0,4).reduce((s,t)=>s+t.payout,0),
      policy_streak:      state.user.tenureMonths ? Math.min(12, Math.floor(state.user.tenureMonths/2)) : 5,
      insurance_payout:   todayTrigger.payout,
      zone,
      city:               state.user.city || 'South Chennai',
      score:              state.user.score || 82,
    };
    state.riskForecast = [
      { time:'Now',   probability: Math.min(98, Math.round(todayTrigger.rain_mm)), icon:'rainy' },
      { time:'+2 hr', probability: 45, icon:'rainy_light' },
      { time:'+4 hr', probability: 22, icon:'cloud' },
    ];
    state.forecastAlert = {
      message: `⚠ ${todayTrigger.trigger} trigger expected today in ${zone} — payout ₹${todayTrigger.payout} queued.`,
      red_hours_72h:    6,
      orange_hours_72h: 14,
      risk_percentage:  78,
    };
    router.navigate('home');
    _navInFlight = false;
  },

  async loadZoneDetails() {
    try {
      state.zoneData = await api(`/dashboard/zone-status/${state.user.zone || 'Zone 4'}`, {}, state);
      router.navigate('live_zone');
    } catch (e) { router.navigate('live_zone'); }
  },

  async goToPayouts() {
    // Mock payout history from trigger schedule
    const schedule = state.triggerSchedule || [];
    const past = schedule.filter(t => t.daysAhead <= 0);
    state.payoutHistory = past.length > 0 ? past.map(t => ({
      type:   t.trigger,
      amount: t.payout,
      status: 'Credited',
      date:   t.date,
      upi_ref: `P-SSAI-${Math.random().toString(36).slice(2,10).toUpperCase()}`,
    })) : [
      { type:'Heavy Rain', amount:408, status:'Credited', date:'17 Apr', upi_ref:'P-SSAI-AB12CD34' },
      { type:'AQI Danger', amount:510, status:'Credited', date:'15 Apr', upi_ref:'P-SSAI-EF56GH78' },
    ];
    const totalPaid = state.payoutHistory.reduce((s,p)=>s+p.amount,0);
    state.payoutTotal = { total: totalPaid, count: state.payoutHistory.length, this_month: totalPaid, this_month_count: state.payoutHistory.length };
    router.navigate('payouts');
  },

  async goToPayoutCelebration() {
    const pid = state.partnerId || 'SW-982341';
    try {
      const latest = await api(`/dashboard/latest-payout/${pid}`, {}, state);
      if (latest) {
        state.latestPayout = latest;
      }
    } catch (e) {
      console.warn('Latest payout fetch issue');
    }

    if (!state.latestPayout) {
      const recent = Array.isArray(state.payoutHistory) && state.payoutHistory.length > 0 ? state.payoutHistory[0] : null;
      state.latestPayout = recent ? {
        amount: Number(recent.amount || 0),
        type: recent.type || 'Heavy Rain',
        status: recent.status || 'Credited',
        signal: recent.reason || `Disruption detected in ${state.user.zone || 'Zone 4'}`,
        upi_ref: recent.upi_ref || 'SIM-PAYOUT-001',
        time: recent.time || '',
        date: recent.date || 'Today',
        zone: state.user.zone || 'Zone 4',
        city: state.user.city || 'South Chennai',
        fraud_score: Number(recent.fraud_score || 0),
        processing_ms: Number(recent.processing_ms || 108000),
      } : {
        amount: 408,
        type: 'Heavy Rain',
        status: 'Credited',
        signal: `Disruption detected in ${state.user.zone || 'Zone 4'}`,
        upi_ref: 'SIM-PAYOUT-001',
        time: 'Now',
        date: 'Today',
        zone: state.user.zone || 'Zone 4',
        city: state.user.city || 'South Chennai',
        fraud_score: 0.12,
        processing_ms: 108000,
      };
    }

    router.navigate('payout_celebration');
  },

  simulateSuccessPayment() {
    if (!state.dashboard) state.dashboard = {};
    state.dashboard.has_active_policy = true;
    state.dashboard.coverage = state.dashboard.coverage || 92;
    state.dashboard.policy_streak = Math.max(1, Number(state.dashboard.policy_streak || 0));
    alert('Mock Razorpay success simulated. Policy state refreshed.');
    router.navigate('home');
  },

  async simulateTrigger() {
    // Phase 3 – Scale: Animated payout simulation using backend lifecycle
    try {
      const res = await api('/simulate/trigger-payout', { method: 'POST', throwOnError: true }, state);
      if (res?.success) {
        state.latestPayout = {
          amount: res.amount_rupees,
          type: res.trigger_type,
          status: res.status,
          signal: `AI-verified ${res.trigger_type} disruption in ${res.zone}`,
          upi_ref: res.upi_ref,
          time: 'Now',
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          zone: res.zone,
          city: state.user.city || 'South Chennai',
          fraud_score: res.fraud_score,
          processing_ms: res.total_processing_ms,
          simulation_steps: res.steps,
        };
        router.navigate('payout_celebration');
        return;
      }
    } catch (e) {
      console.warn('Simulation API fallback:', e.message);
    }
    // Fallback to local simulation if API fails
    const hourlyRate = state.user?.hourlyRate || 102;
    const triggerHrs = state.tier === 'premium' ? 5 : 4;
    const amount = hourlyRate * triggerHrs;
    
    // Add realistic variance
    const randScore = (0.10 + Math.random() * 0.15).toFixed(2);
    const randMs = 60000 + Math.floor(Math.random() * 60000);

    state.latestPayout = {
      amount,
      type: state.tier === 'premium' ? 'AQI Danger' : 'Heavy Rain',
      status: 'Credited',
      signal: `Simulated trigger fired in ${state.user.zone || 'Zone 4'}`,
      upi_ref: `SIM-${Date.now()}`,
      time: 'Now',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      zone: state.user.zone || 'Zone 4',
      city: state.user.city || 'South Chennai',
      fraud_score: Number(randScore),
      processing_ms: randMs,
      simulation_steps: [
        { stage: 'trigger', icon: 'thunderstorm', title: 'Neural Trigger Verified', detail: 'Cross-checked with secondary sources', time_ms: 12 },
        { stage: 'fraud', icon: 'security', title: 'Fraud Graph Analyzed', detail: 'Agent swarm approved authenticity', time_ms: 65 },
        { stage: 'credited', icon: 'account_balance', title: 'IMPS Transfer Executed', detail: `₹${amount} credited via NPCI network`, time_ms: 16 }
      ]
    };
    router.navigate('payout_celebration');
  },

  logout() {
    state.token = null;
    window.localStorage.removeItem('securesync_token');
    clearApiCache();
    router.navigate('onboarding');
  },
  
  async sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim() || state.chatLoading) return;
    const msg = input.value.trim();
    state.chatHistory.push({ role: 'user', content: msg });
    input.value = '';
    state.chatLoading = true;
    // Update chat section only, not full page re-render
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
      chatContainer.innerHTML += `<div class="bg-primary/10 text-on-surface text-sm p-3 rounded-2xl rounded-br-sm ml-auto max-w-[80%]">${msg}</div>`;
      chatContainer.innerHTML += `<div class="bg-surface-container-high text-on-surface-variant text-sm p-3 rounded-2xl rounded-bl-sm max-w-[80%] animate-pulse">Thinking...</div>`;
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    try {
      const res = await api('/support/chat', { method: 'POST', body: JSON.stringify({ message: msg, history: state.chatHistory.slice(0, -1) }) }, state);
      state.chatHistory.push({ role: 'assistant', content: res?.reply || "Sorry bhai, something went wrong." });
    } catch (e) { state.chatHistory.push({ role: 'assistant', content: "Network issue bhai." }); }
    finally { state.chatLoading = false; router.navigate('account'); }
  },

  changeLanguage(lang) {
    state.language = lang;
    window.localStorage.setItem('securesync_lang', lang);
    router.navigate(state.screen);
  }
};

const screens = {
  onboarding: onboardingScreen, login: loginScreen, otp: otpScreen,
  verification_start: verificationStartScreen, verification_score: verificationScoreScreen,
  premium: premiumScreen, upi: upiScreen, confirmation: confirmationScreen,
  home: homeScreen, coverage: coverageScreen, live_zone: liveZoneScreen,
  payouts: payoutsScreen, payout_celebration: payoutCelebrationScreen, account: accountScreen,
};

window.router = router;
window.actions = actions;
window.state = state;

async function boot() {
  if (appBootstrapped) return;
  appBootstrapped = true;
  const savedToken = window.localStorage.getItem('securesync_token');
  if (savedToken) {
    state.token = savedToken;
    try {
      const me = await api('/auth/me', { throwOnError: true }, state);
      if (me?.worker_id) {
        state.partnerId = me.partner_id;
        state.user.name = me.name;
        if (me.is_verified) {
          actions.goToDashboard();
        } else {
          router.navigate('verification_start');
        }
        return;
      }
    } catch (e) {
      if (e && e.status === 401) {
        state.token = null;
        window.localStorage.removeItem('securesync_token');
      } else {
        console.warn('Network issue or backend unreachable during boot:', e);
        actions.goToDashboard(); // Stay offline/cached
        return;
      }
    }
  }
  router.navigate('verification_start');
}

boot();

window.addEventListener('offline-action-queued', () => {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-24 left-4 right-4 bg-surface-container-highest text-on-surface p-4 rounded-xl shadow-lg border border-outline-variant/20 z-50 flex items-center gap-3 animate-slide-up';
  toast.innerHTML = `
    <span class="material-symbols-outlined text-warning">wifi_off</span>
    <div class="flex-1">
      <p class="text-sm font-bold">You're offline</p>
      <p class="text-xs text-on-surface-variant">Your action has been safely queued and will sync automatically.</p>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
});
