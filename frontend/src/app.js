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

  goToLogin() { router.navigate('login'); },

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
    if (_navInFlight) return;
    _navInFlight = true;
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
    finally { _navInFlight = false; }
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
  router.navigate(state.screen);
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
