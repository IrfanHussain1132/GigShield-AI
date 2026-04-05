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

function createIdempotencyKey(prefix = 'idem') {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

// --- Router ---
const router = {
  navigate(screen) {
    state.screen = screen;
    const container = document.getElementById('screen-container');
    if (!container) return;
    const renderFn = screens[screen];
    if (!renderFn) { console.error('Unknown screen:', screen); return; }
    
    container.style.willChange = 'opacity, transform';
    container.classList.remove('screen-enter');
    
    // Apply font-family and lang attribute
    const currentLang = supportedLanguages.find(l => l.code === (state.language || 'en'));
    document.body.style.fontFamily = currentLang ? `'${currentLang.font}', sans-serif` : 'var(--font-sans)';
    document.documentElement.lang = state.language || 'en';

    container.innerHTML = renderFn(state);

    requestAnimationFrame(() => {
      container.classList.add('screen-enter');
      container.scrollTop = 0;
      // Reset hint after animation
      setTimeout(() => { container.style.willChange = 'auto'; }, 500);
    });

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
          
          // Language support for nav text
          const span = item.querySelector('span:not(.material-symbols-outlined)');
          if (span && key) {
            span.textContent = t(key) || key.charAt(0)?.toUpperCase() + key.slice(1);
          }
        });
      } else {
        nav.style.display = 'none';
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
        const slides = Array.from(slider.querySelectorAll(':scope > section'));
        const currentLeft = slider.scrollLeft;
        let closestIndex = 0;
        let closestDistance = Infinity;
        slides.forEach((slide, index) => {
            const distance = Math.abs(slide.offsetLeft - currentLeft);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });
        if (closestIndex !== state.slideIndex) {
            state.slideIndex = closestIndex;
            actions.updateOnboardingDots();
        }
    }, { passive: true });
  },

  goToLogin() { router.navigate('login'); },

  async login() {
    const input = document.getElementById('mobile');
    if (input) state.phone = input.value;
    if (state.phone.length < 10) { alert('Enter a valid 10-digit number'); return; }

    if (state.phase2MockOtpEnabled) {
      console.log('[Bypass] Skipping send-otp call for mock mode');
      router.navigate('otp');
      return;
    }

    try {
      const res = await api('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: state.phone }),
      }, state);
      if (res?.debug_code) console.log('OTP code:', res.debug_code);
      router.navigate('otp');
    } catch (e) {
      alert('Could not send OTP. Try again shortly.');
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
        body: JSON.stringify({ phone: state.phone, otp: code }),
      }, state);
      if (res?.token) {
        state.token = res.token;
        window.localStorage.setItem('securesync_token', res.token);
        router.navigate('verification_start');
      }
    } catch (e) {
      alert(e.detail || 'Invalid OTP. Try again.');
    } finally {
        if (state.otpInterval) clearInterval(state.otpInterval);
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
      if (e.status === 401) {
        alert('Session expired. Please log in again.');
        actions.logout();
      } else {
        alert(e.detail || 'Verification failed. Please check your Partner ID.');
      }
    }
  },

  async goToPremium() {
    try {
      const partnerId = state.partnerId || 'SW-982341';
      const zone = state.user.zone || 'Zone 4';
      const [basic, prem] = await Promise.all([
        api('/workers/premium-quote', { method: 'POST', body: JSON.stringify({ partner_id: partnerId, zone, tier: 'Basic' }) }, state),
        api('/workers/premium-quote', { method: 'POST', body: JSON.stringify({ partner_id: partnerId, zone, tier: 'Premium' }) }, state)
      ]);
      state.premiumQuotes = { key: `${partnerId}|${zone}`, basic, premium: prem };
      actions.selectTier(state.tier);
    } catch (e) { console.warn('Premium API issue'); router.navigate('premium'); }
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
    try {
      const idempotencyKey = createIdempotencyKey('policy');
      const res = await api('/policies/purchase', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ partner_id: state.partnerId, premium_amount: state.premiumAmount, tier: state.tier === 'premium' ? 'Premium' : 'Basic', idempotency_key: idempotencyKey }),
      }, state);
      if (res?.status === 'success') {
        state.policy = res;
        router.navigate('confirmation');
      }
    } catch (e) { alert(e.detail || 'Payment failed.'); }
    finally { state.purchaseInFlight = false; }
  },

  async goToDashboard() {
    const pid = state.partnerId || 'SW-982341';
    const zone = state.user.zone || 'Zone 4';
    try {
      const [summary, weather, forecast, alert] = await Promise.all([
        api(`/dashboard/summary/${pid}`, {}, state),
        api(`/dashboard/live-weather/${zone}`, {}, state),
        api(`/dashboard/risk-forecast/${zone}`, {}, state),
        api(`/forecast/alert/${zone}`, {}, state)
      ]);
      state.dashboard = summary;
      state.weather = weather;
      state.riskForecast = forecast;
      state.forecastAlert = alert;
      router.navigate('home');
    } catch (e) { console.warn('Dashboard fetch issue'); router.navigate('home'); }
  },

  async loadZoneDetails() {
    try {
      state.zoneData = await api(`/dashboard/zone-status/${state.user.zone || 'Zone 4'}`, {}, state);
      router.navigate('live_zone');
    } catch (e) { router.navigate('live_zone'); }
  },

  async goToPayouts() {
    const pid = state.partnerId || 'SW-982341';
    try {
      const [history, total] = await Promise.all([
        api(`/dashboard/payout-history/${pid}`, {}, state),
        api(`/dashboard/payout-total/${pid}`, {}, state)
      ]);
      state.payoutHistory = history;
      state.payoutTotal = total;
      router.navigate('payouts');
    } catch (e) { router.navigate('payouts'); }
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

  simulateTrigger() {
    const amount = state.tier === 'premium' ? 510 : 408;
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
      fraud_score: 0.18,
      processing_ms: 93000,
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
    router.navigate('account'); // Refresh
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
      state.token = null;
      window.localStorage.removeItem('securesync_token');
    }
  }
  router.navigate(state.screen);
}

boot();
