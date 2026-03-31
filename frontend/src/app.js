// ============================
// SecureSync AI — PWA App Core
// Phase 2: Full Backend Integration (Optimized)
// ============================
import { onboardingScreen, loginScreen, otpScreen } from './screens/onboarding.js';
import { verificationStartScreen, verificationScoreScreen } from './screens/verification.js';
import { premiumScreen, upiScreen, confirmationScreen } from './screens/purchase.js';
import { homeScreen, coverageScreen, liveZoneScreen, payoutsScreen, payoutCelebrationScreen, accountScreen } from './screens/dashboard.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001/api/v1';
const PHASE2_MOCK_OTP_ENABLED = String(import.meta.env.VITE_PHASE2_MOCK_OTP || 'true').toLowerCase() === 'true';
const PHASE2_MOCK_OTP_CODE = String(import.meta.env.VITE_PHASE2_MOCK_OTP_CODE || '123456');
const _apiCache = {}; // Phase 2: Instant Neural Cache
const ONBOARDING_SLIDE_COUNT = 3;
let appBootstrapped = false;

function createIdempotencyKey(prefix = 'idem') {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

// --- Optimized API Helper ---
async function api(path, options = {}) {
  const isGet = !options.method || options.method === 'GET';
  const cacheKey = `${path}_${JSON.stringify(options.params || {})}`;
  
  // Cache Hit Check (60s TTL)
  if (isGet && _apiCache[cacheKey] && (Date.now() - _apiCache[cacheKey].ts < 60000)) {
    return _apiCache[cacheKey].data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // Increased timeout for production resilience
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    // Auto-inject JWT from state — no manual header needed at call sites
    if (state?.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.detail = payload?.detail || payload?.message || null;
      throw err;
    }
    const data = payload ?? (await res.text().catch(() => null));
    
    // Save to Cache if GET
    if (isGet) _apiCache[cacheKey] = { data, ts: Date.now() };
    return data;
  } catch (e) {
    if (options.throwOnError || !isGet) throw e;
    if (!e.status || e.status >= 500) {
      console.warn('[API Neural Fallback]:', path, e.message);
    }
    return null;
  }
}

// --- Global State ---
const state = {
  screen: 'onboarding',
  phone: '',
  otp: ['','','','','',''],
  phase2MockOtpEnabled: PHASE2_MOCK_OTP_ENABLED,
  phase2MockOtpCode: PHASE2_MOCK_OTP_CODE,
  otpTimer: 114,
  otpInterval: null,
  platform: 'swiggy',
  partnerId: '',
  tier: 'basic',
  premiumAmount: 25,
  slideIndex: 0,
  token: window.localStorage.getItem('securesync_token') || null,
  user: { name: 'Rajan Kumar', zone: 'Zone 4', city: 'South Chennai', score: 92 },
  policy: null,
  payouts: [],
  // Live data from backend
  weather: null,       // { rain_mm, aqi, temp_c, visibility_km }
  zoneData: null,      // Full zone status response
  dashboard: null,     // Dashboard summary response
  payoutHistory: [],   // Payout history array
  payoutTotal: null,   // { total, count, this_month, this_month_count }
  premiumBreakdown: null, // SHAP breakdown
  premiumQuotes: {
    key: null,
    basic: null,
    premium: null,
  },
  latestPayout: null,  // Latest payout for celebration screen
  riskForecast: null,  // Hourly risk probabilities
  purchaseInFlight: false,
};

// --- Router ---
const router = {
  navigate(screen) {
    state.screen = screen;
    const container = document.getElementById('screen-container');
    if (!container) return;
    const renderFn = screens[screen];
    if (!renderFn) { console.error('Unknown screen:', screen); return; }
    
    // Smooth transition with draft-aligned motion rhythm.
    container.classList.remove('screen-enter');
    container.innerHTML = renderFn(state);

    requestAnimationFrame(() => {
      container.classList.add('screen-enter');
      container.scrollTop = 0;
    });

    // Bottom nav
    const navScreens = ['home','coverage','payouts','account','live_zone'];
    const nav = document.getElementById('bottom-nav');
    if (nav) {
      if (navScreens.includes(screen)) {
        nav.style.display = 'flex';
        nav.querySelectorAll('.nav-item').forEach(item => {
          const key = item.dataset.nav;
          const isActive = key === screen || (screen === 'live_zone' && key === 'coverage');
          item.classList.toggle('active', isActive);
          if (isActive) item.setAttribute('aria-current', 'page');
          else item.removeAttribute('aria-current');
        });
      } else {
        nav.style.display = 'none';
      }
    }

    // Post-render hooks
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
      dot.style.background = index === activeIndex ? '#005e52' : '#bdc9c5';
      dot.setAttribute('aria-pressed', index === activeIndex ? 'true' : 'false');
    });
  },

  goToSlide(index, behavior = 'smooth') {
    const slider = document.getElementById('onb-slider');
    if (!slider) return;
    const slides = Array.from(slider.querySelectorAll(':scope > section'));
    const slideCount = slides.length || ONBOARDING_SLIDE_COUNT;
    const clampedIndex = Math.max(0, Math.min(index, slideCount - 1));
    state.slideIndex = clampedIndex;
    const targetSlide = slides[clampedIndex];
    const targetLeft = targetSlide ? targetSlide.offsetLeft : clampedIndex * slider.clientWidth;
    slider.scrollTo({ left: targetLeft, behavior });
    actions.updateOnboardingDots();
  },

  initOnboarding() {
    const slider = document.getElementById('onb-slider');
    const dots = document.querySelectorAll('.onb-dot');
    if (!slider || !dots.length) return;
    const slides = Array.from(slider.querySelectorAll(':scope > section'));
    const slideCount = slides.length || ONBOARDING_SLIDE_COUNT;

    state.slideIndex = 0;
    actions.updateOnboardingDots();

    // Ensure visual position and state are aligned when revisiting onboarding.
    slider.scrollTo({ left: 0, behavior: 'auto' });

    const syncDotsToScroll = () => {
      if (!slides.length) return;
      const currentLeft = slider.scrollLeft;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft - currentLeft);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      const clamped = Math.max(0, Math.min(closestIndex, slideCount - 1));
      if (clamped !== state.slideIndex) {
        state.slideIndex = clamped;
        actions.updateOnboardingDots();
      }
    };

    let ticking = false;
    slider.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        syncDotsToScroll();
        ticking = false;
      });
    }, { passive: true });

    slider.addEventListener('touchend', () => {
      requestAnimationFrame(syncDotsToScroll);
    }, { passive: true });

    slider.addEventListener('pointerup', () => {
      requestAnimationFrame(syncDotsToScroll);
    }, { passive: true });

    dots.forEach((dot, index) => {
      dot.style.cursor = 'pointer';
      dot.setAttribute('role', 'button');
      dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
      dot.tabIndex = 0;

      dot.addEventListener('click', () => {
        actions.goToSlide(index);
      });

      dot.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          actions.goToSlide(index);
        }
      });
    });
  },
  nextSlide() {
    actions.goToSlide(state.slideIndex + 1);
  },
  goToLogin() { router.navigate('login'); },

  async login() {
    const input = document.getElementById('mobile');
    if (input) state.phone = input.value;
    if (state.phone.length < 10) { alert('Enter a valid 10-digit number'); return; }
    try {
      const res = await api('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: state.phone }),
      });
      if (!res || res.status !== 'success') {
        alert('Could not send OTP right now. Please try again shortly.');
        return;
      }
      if (res.debug_code) console.log('OTP code:', res.debug_code);
    } catch (e) { console.warn('Login API issue'); }
    router.navigate('otp');
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
    if (current && current.value !== digit) {
      current.value = digit;
    }
    if (digit && index < 5) {
      const next = document.getElementById('otp-' + (index + 1));
      if (next) next.focus();
    }
    if (state.otp.every(d => /^\d$/.test(d))) {
      setTimeout(() => actions.verifyOtp(), 300);
    }
  },
  handleOtpKeydown(index, e) {
    if (e.key === 'Backspace' && !state.otp[index] && index > 0) {
      const prev = document.getElementById('otp-' + (index - 1));
      if (prev) { prev.focus(); state.otp[index - 1] = ''; prev.value = ''; }
    }
  },
  async verifyOtp() {
    const code = state.otp.join('');
    if (!state.phone) {
      alert('Session expired. Please enter your mobile number again.');
      router.navigate('login');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      alert('Enter a valid 6-digit OTP.');
      return;
    }

    try {
      const res = await api('/auth/verify-otp', {
        method: 'POST',
        throwOnError: true,
        body: JSON.stringify({ phone: state.phone, otp: code }),
      });
      if (res && res.token) {
        state.token = res.token;
        window.localStorage.setItem('securesync_token', res.token);
      } else {
        alert('Invalid OTP. Please try again.');
        return;
      }
    } catch (e) {
      if (e.status === 401) {
        if (state.phase2MockOtpEnabled) {
          alert(`Invalid or expired OTP. Phase-2 demo mode is enabled, use ${state.phase2MockOtpCode}.`);
        } else {
          alert('Invalid or expired OTP. Tap Resend to get a fresh code.');
        }
      } else if (e.status === 429) {
        alert('Too many OTP attempts. Please wait and try again.');
      } else {
        alert(e.detail || 'OTP verification failed. Please try again.');
      }
      return;
    }
    if (state.otpInterval) clearInterval(state.otpInterval);
    state.otp = ['', '', '', '', '', ''];
    router.navigate('verification_start');
  },
  async resendOtp() {
    if (!state.phone) {
      alert('Session expired. Please enter your mobile number again.');
      router.navigate('login');
      return;
    }
    try {
      const res = await api('/auth/send-otp', {
        method: 'POST',
        throwOnError: true,
        body: JSON.stringify({ phone: state.phone }),
      });
      if (!res || res.status !== 'success') {
        alert('Could not resend OTP right now. Please try again shortly.');
        return;
      }
      state.otp = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        const el = document.getElementById('otp-' + i);
        if (el) el.value = '';
      }
      const first = document.getElementById('otp-0');
      if (first) first.focus();
      if (res.debug_code) console.log('OTP code:', res.debug_code);
      actions.startOtpTimer();
    } catch (e) {
      if (e.status === 429) {
        alert('OTP resend limit reached. Please wait before trying again.');
      } else {
        alert(e.detail || 'Could not resend OTP right now.');
      }
    }
  },

  selectPlatform(p) {
    state.platform = p;
    document.querySelectorAll('.plat-btn').forEach(b => {
      const isActive = b.dataset.plat === p;
      b.className = 'plat-btn flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all '
        + (isActive ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant');
    });
  },
  async verifyPartner() {
    const input = document.getElementById('partner-id-input');
    if (input) state.partnerId = input.value;
    if (!state.partnerId) { alert('Enter your Partner ID'); return; }
    if (!state.token) {
      alert('Please sign in again to continue.');
      router.navigate('login');
      return;
    }

    try {
      const res = await api('/workers/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${state.token || ''}`,
        },
        body: JSON.stringify({ partner_id: state.partnerId, platform: state.platform }),
      });
      if (res && res.status === 'ACTIVE') {
        Object.assign(state.user, {
          name: res.name || state.user.name,
          zone: res.zone || state.user.zone,
          city: res.city || state.user.city,
          score: res.score || state.user.score,
          tenure: res.tenure || '',
          tenureMonths: res.tenure_months || 0,
          hourlyRate: res.hourly_rate || 102,
          weeklyIncome: res.weekly_income || 6120,
          workerId: res.worker_id
        });
        state.premiumQuotes = { key: null, basic: null, premium: null };
        state.premiumBreakdown = null;
      } else {
        alert('Partner verification failed. Please check your Partner ID.');
        return;
      }
    } catch (e) {
      console.error('Verification failed');
      alert('Partner verification failed. Please try again.');
      return;
    }
    router.navigate('verification_score');
  },

  async goToPremium() {
    if (!state.token) {
      router.navigate('login');
      return;
    }

    const partnerId = state.partnerId || 'SW-982341';
    const zone = state.user.zone || 'Zone 4';
    const cacheKey = `${partnerId}|${zone}`;

    try {
      const hasCachedQuotes = (
        state.premiumQuotes.key === cacheKey
        && state.premiumQuotes.standard
        && state.premiumQuotes.plus
      );

      if (!hasCachedQuotes) {
        const headers = { Authorization: `Bearer ${state.token || ''}` };
        const [basicQuote, premiumQuote] = await Promise.all([
          api('/workers/premium-quote', {
            method: 'POST',
            headers,
            throwOnError: true,
            body: JSON.stringify({
              partner_id: partnerId,
              zone,
              tier: 'Basic',
            }),
          }),
          api('/workers/premium-quote', {
            method: 'POST',
            headers,
            throwOnError: true,
            body: JSON.stringify({
              partner_id: partnerId,
              zone,
              tier: 'Premium',
            }),
          }),
        ]);

        if (basicQuote?.final_premium && premiumQuote?.final_premium) {
          state.premiumQuotes = {
            key: cacheKey,
            basic: basicQuote,
            premium: premiumQuote,
          };
        }
      }

      const selectedKey = state.tier === 'premium' ? 'premium' : 'basic';
      const selectedQuote = state.premiumQuotes[selectedKey];
      if (selectedQuote?.final_premium) {
        state.premiumAmount = selectedQuote.final_premium;
        state.premiumBreakdown = selectedQuote;
      }
    } catch (e) { console.warn('Premium API issue'); }
    router.navigate('premium');
  },

  async selectTier(t) {
    if (!state.token) {
      router.navigate('login');
      return;
    }

    state.tier = t;
    const selectedKey = t;
    const cachedQuote = state.premiumQuotes[selectedKey];

    if (cachedQuote?.final_premium) {
      state.premiumAmount = cachedQuote.final_premium;
      state.premiumBreakdown = cachedQuote;
    } else {
      try {
        const res = await api('/workers/premium-quote', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${state.token || ''}`,
          },
          throwOnError: true,
          body: JSON.stringify({
            partner_id: state.partnerId || 'SW-982341',
            zone: state.user.zone || 'Zone 4',
            tier: t === 'premium' ? 'Premium' : 'Basic',
          }),
        });
        if (res && res.final_premium) {
          state.premiumAmount = res.final_premium;
          state.premiumBreakdown = res;
          state.premiumQuotes[selectedKey] = res;
        } else {
          state.premiumAmount = t === 'basic' ? 25 : 47;
        }
      } catch (e) {
        state.premiumAmount = t === 'basic' ? 25 : 47;
      }
    }

    // Optimized: Only re-render if screen changed or if we want to avoid blink.
    // If we're already on 'premium' screen, update innerHTML directly to avoid CSS transitions causing blink.
    if (state.screen === 'premium') {
      const container = document.getElementById('screen-container');
      if (container) {
        container.innerHTML = premiumScreen(state);
        // We skip the router.navigate calls that trigger class toggles and requestAnimationFrame
        return;
      }
    }
    router.navigate('premium');
  },

  buyPolicy() { router.navigate('upi'); },

  async activateCoverage() {
    if (!state.token) {
      alert('Please sign in again to continue.');
      router.navigate('login');
      return;
    }

    if (state.purchaseInFlight) {
      return;
    }

    state.purchaseInFlight = true;
    try {
      const idempotencyKey = createIdempotencyKey('policy');
      const res = await api('/policies/purchase', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${state.token || ''}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          partner_id: state.partnerId,
          premium_amount: state.premiumAmount,
          tier: state.tier === 'premium' ? 'Premium' : 'Basic',
          idempotency_key: idempotencyKey,
        }),
      });
      if (res && res.status === 'success') {
        state.policy = {
          id: res.policy_id,
          tier: res.tier,
          premium: res.premium_amount,
          startDate: res.start_date,
          endDate: res.end_date,
          maxPayout: res.max_payout,
        };
        router.navigate('confirmation');
      } else {
        const msg = res?.message || res?.detail || 'Payment could not be completed.';
        alert(`${msg} Please try again.`);
      }
    } catch (e) {
      console.error('Policy purchase failed', e);
      const msg = e.detail || 'Payment could not be completed.';
      alert(`${msg} Please try again.`);
    } finally {
      state.purchaseInFlight = false;
    }
  },

  async goToDashboard() {
    if (!state.token) {
      router.navigate('login');
      return;
    }

    const pid = state.partnerId || 'SW-982341';
    try {
      const [summary, weather, forecast] = await Promise.all([
        api(`/dashboard/summary/${pid}`, { headers: { Authorization: `Bearer ${state.token || ''}` } }),
        api(`/dashboard/live-weather/${state.user.zone || 'Zone 4'}`, { headers: { Authorization: `Bearer ${state.token || ''}` } }),
        api(`/dashboard/risk-forecast/${state.user.zone || 'Zone 4'}`, { headers: { Authorization: `Bearer ${state.token || ''}` } }),
      ]);
      if (summary) {
        state.dashboard = summary;
        state.user.name = summary.name || state.user.name;
        state.user.score = summary.score || state.user.score;
      }
      if (weather) state.weather = weather;
      if (forecast) state.riskForecast = forecast;
    } catch (e) { console.warn('Dashboard background fetch issue'); }
    router.navigate('home');
  },

  async loadZoneDetails() {
    if (!state.token) {
      router.navigate('login');
      return;
    }

    try {
      const res = await api(`/dashboard/zone-status/${state.user.zone || 'Zone 4'}`, {
        headers: { Authorization: `Bearer ${state.token || ''}` },
      });
      if (res) state.zoneData = res;
    } catch (e) { console.warn('Zone status fetch issue'); }
    router.navigate('live_zone');
  },

  async goToPayouts() {
    if (!state.token) {
      router.navigate('login');
      return;
    }

    const pid = state.partnerId || 'SW-982341';
    try {
      const [history, total] = await Promise.all([
        api(`/dashboard/payout-history/${pid}`, { headers: { Authorization: `Bearer ${state.token || ''}` } }),
        api(`/dashboard/payout-total/${pid}`, { headers: { Authorization: `Bearer ${state.token || ''}` } }),
      ]);
      if (history) state.payoutHistory = history;
      if (total) state.payoutTotal = total;
    } catch (e) { console.warn('Payout history fetch issue'); }
    router.navigate('payouts');
  },

  async goToPayoutCelebration() {
    if (!state.token) {
      router.navigate('login');
      return;
    }

    const pid = state.partnerId || 'SW-982341';
    try {
      const res = await api(`/dashboard/latest-payout/${pid}`, {
        headers: { Authorization: `Bearer ${state.token || ''}` },
      });
      if (res) state.latestPayout = res;
    } catch (e) { console.warn('Payout celeb fetch issue'); }
    router.navigate('payout_celebration');
  },

  backToDashboard() { actions.goToDashboard(); },
  logout() {
    state.token = null;
    window.localStorage.removeItem('securesync_token');
    state.policy = null;
    state.dashboard = null;
    state.weather = null;
    state.zoneData = null;
    state.payoutHistory = [];
    state.payoutTotal = null;
    state.latestPayout = null;
    state.riskForecast = null;
    state.premiumQuotes = { key: null, basic: null, premium: null };
    state.premiumBreakdown = null;
    state.partnerId = '';
    // Clear API cache on logout
    Object.keys(_apiCache).forEach(k => delete _apiCache[k]);
    router.navigate('onboarding');
  },
};

// --- Screen Registry ---
const screens = {
  onboarding: onboardingScreen,
  login: loginScreen,
  otp: otpScreen,
  verification_start: verificationStartScreen,
  verification_score: verificationScoreScreen,
  premium: premiumScreen,
  upi: upiScreen,
  confirmation: confirmationScreen,
  home: homeScreen,
  coverage: coverageScreen,
  live_zone: liveZoneScreen,
  payouts: payoutsScreen,
  payout_celebration: payoutCelebrationScreen,
  account: accountScreen,
};

// Expose globals for onclick handlers
window.router = router;
window.actions = actions;
window.state = state;

async function bootAppOnce() {
  if (appBootstrapped) return;
  appBootstrapped = true;

  // Restore persisted session on refresh — prevent login wall after reload
  const savedToken = window.localStorage.getItem('securesync_token');
  if (savedToken && !state.token) {
    state.token = savedToken;
    // Validate token is still live by hitting /auth/me
    try {
      const me = await api('/auth/me', { throwOnError: true });
      if (me && me.worker_id) {
        // Restore session state
        state.partnerId = me.partner_id || '';
        state.user = {
          ...state.user,
          name: me.name || (me.partner_id ? `Partner ${me.partner_id}` : state.user.name),
          partnerId: me.partner_id || '',
        };
        // Navigate to home — session is alive
        router.navigate('home');
        return;
      }
    } catch (e) {
      // Token expired or invalid — clear it
      state.token = null;
      window.localStorage.removeItem('securesync_token');
    }
  }

  router.navigate(state.screen);
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  bootAppOnce();
});
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootAppOnce();
}
