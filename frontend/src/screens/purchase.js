// Premium, UPI Payment, and Confirmation screens
import { t, formatCurrency } from '../utils/i18n.js';

const RAZORPAY_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRx9kiog-jbeMvERoPn0nj8z9OgTb-tTP26jY4rYUK9AFuoir6WU6HYTB0zychn03VprUtCV5dsVur9Uh_UmT97zbj1fZe31VZSVM8DLpf4_ztCUIqZibCr87l3pYWwkMfQZ66hX5zAuX7qsov7yL5W6Jif47BPLTJWbWwsPIKpaPE1xHKCpUXwFeZfIxCgONfIrt2rRx0KeHrRdGyYXG6BbcrmTi69vVNuYb4AI6osaLmJ4KFa4Av_zvUutCK_C8DyB7UgiIdZFdK';
const RAZORPAY_LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjUOUpR5wNC3bZNBGb1O1LM2OvCR3xGm8GKyuk51Qsq1QBij8GdhRg53stGUjiA4H4hvy0I0zOY8mRSh9SY5ftTHWVPnAIGy7mkuUSyx5pPloS7bAAKUVkZ2_fV18VPRrIzETOlSbnZLfBnrEoeknoahvZK4cn83dXxi3VyQgPhlkWpfzUCyRX-Nj9-_QstZZkEw2Nhtl-RjDVF6kFRjyPkHW5hgjip9f4iBWgIzhx2DPCdTWGdf668EaB9ez1BX_Le1AeqT68lJ3p';

function renderAvatar(state) {
  const initial = (state.user?.name || 'Partner').charAt(0).toUpperCase();
  return `<div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-lg shadow-sm border border-white/20">${initial}</div>`;
}

export function premiumScreen(state) {
  const score = Math.max(0, Math.min(Number(state.user.score || 82), 99));
  const stdSel = state.tier === 'basic';
  const plusSel = state.tier === 'premium';

  const basicQuote = state.premiumQuotes?.basic || null;
  const premiumQuote = state.premiumQuotes?.premium || null;
  const basicAmount = basicQuote?.final_premium ?? (stdSel ? state.premiumAmount : 25);
  const premiumAmount = premiumQuote?.final_premium ?? (plusSel ? state.premiumAmount : 47);
  const amt = stdSel ? basicAmount : premiumAmount;

  const breakdown = (stdSel ? basicQuote : premiumQuote) || state.premiumBreakdown;
  const adjustments = (breakdown?.adjustments || (stdSel ? [
    { label: 'Rain Risk (Mon-Wed)', value: 1.20, icon: 'rainy' },
    { label: 'Heat Warning Peak', value: 0.40, icon: 'light_mode' },
    { label: 'Zone Risk Factor', value: -1.10, icon: 'distance' },
    { label: 'Clean Claim History', value: -0.20, icon: 'history' },
    { label: 'Safety Score Reward', value: -2.50, icon: 'insights' },
  ] : [
    { label: 'Rain Risk (Mon-Wed)', value: 5.20, icon: 'rainy' },
    { label: 'Heat Warning Peak', value: 2.40, icon: 'light_mode' },
    { label: 'Zone Risk Factor', value: -3.10, icon: 'distance' },
    { label: 'Clean Claim History', value: -0.80, icon: 'history' },
    { label: 'Driver Score Reward', value: -12.50, icon: 'insights' },
  ]));

  const adjRows = adjustments.map((a) => {
    const isPositive = a.value > 0;
    const colorClass = isPositive ? 'text-on-surface' : 'text-primary';
    const iconColor = isPositive ? 'text-on-surface' : 'text-primary';
    const prefix = isPositive ? '+' : '-';
    return `
      <div class="flex items-center justify-between py-1.5 gap-2">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 shrink-0 rounded-xl bg-white flex items-center justify-center border border-outline-variant/10 shadow-sm">
            <span class="material-symbols-outlined ${iconColor} text-[18px]">${a.icon}</span>
          </div>
          <span class="font-bold text-sm text-on-surface leading-snug break-words">${a.label}</span>
        </div>
        <span class="${colorClass} font-black text-sm whitespace-nowrap shrink-0">${prefix}${formatCurrency(Math.abs(a.value))}</span>
      </div>`;
  }).join('');

  return `
<div class="min-h-full bg-surface flex flex-col">
  <header class="flex justify-between items-center w-full px-6 py-4 bg-white sticky top-0 z-20 border-b border-outline-variant/10 shadow-sm">
    <div class="flex items-center gap-3">
      ${renderAvatar(state)}
      <h1 class="font-headline font-black tracking-tighter text-primary text-xl">SecureSync AI</h1>
    </div>
    <button class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary shadow-sm" aria-label="Notifications"><span class="material-symbols-outlined">notifications</span></button>
  </header>

  <main class="flex-1 px-5 pt-8 pb-32 max-w-md mx-auto w-full">
    <div class="mb-6">
      <p class="text-primary font-black text-xs uppercase tracking-widest mb-2 opacity-80">Your Weekly Premium</p>
      <div class="flex items-baseline gap-1">
        <span class="font-noto font-black text-5xl text-primary tracking-tighter">${formatCurrency(amt)}</span>
        <span class="text-on-surface-variant font-bold text-lg ml-1 opacity-60">${t('weekly_coverage') || '/ week'}</span>
      </div>
    </div>

    <div class="mb-10">
      <div class="inline-flex items-center bg-gradient-to-r from-primary to-primary-container text-white px-5 py-2.5 rounded-full gap-2 shadow-xl shadow-primary/20 border border-white/20 relative overflow-hidden group">
        <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
        <span class="material-symbols-outlined text-[20px] drop-shadow-md text-tertiary-fixed-dim" style="font-variation-settings:'FILL' 1;">verified</span>
        <span class="font-headline font-black text-[15px] tracking-tight truncate drop-shadow-sm">${score} - ${score >= 90 ? 'Excellent' : score >= 80 ? 'Strong' : 'Good'}</span>
      </div>
    </div>

    <section class="bg-white rounded-[2.5rem] p-8 mb-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-outline-variant/5">
      <h3 class="font-headline font-black text-2xl mb-6 text-on-surface tracking-tight">${t('why_you_pay') || 'Why you pay'} ${formatCurrency(amt)}</h3>
      <div class="space-y-4">${adjRows}</div>
    </section>

    <div class="grid grid-cols-2 gap-4 mb-10">
      <button type="button" onclick="actions.selectTier('basic')" class="${stdSel ? 'bg-white border-primary shadow-2xl shadow-primary/10 scale-[1.02]' : 'bg-surface-container border-transparent opacity-80 hover:opacity-100'} border-2 rounded-[2rem] p-5 transition-all duration-300 text-left relative overflow-hidden group">
        ${stdSel ? '<div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[4rem] -z-10"></div>' : ''}
        <div class="flex justify-between items-start mb-4 relative z-10">
          <span class="${stdSel ? 'bg-primary/10 text-primary border-primary/20' : 'bg-on-surface/5 text-on-surface-variant border-on-surface/5'} text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm">Basic</span>
          ${stdSel ? '<span class="material-symbols-outlined text-primary text-[24px] drop-shadow-sm" style="font-variation-settings:\'FILL\' 1;">check_circle</span>' : '<div class="w-6 h-6 rounded-full border-2 border-outline-variant/60 shadow-inner"></div>'}
        </div>
        <div class="relative z-10">
            <div class="flex items-baseline font-noto mb-1"><span class="text-2xl font-black text-on-surface shadow-sm">${formatCurrency(basicAmount)}</span><span class="text-[10px] text-on-surface-variant font-bold opacity-60 ml-1">${t('weekly_coverage') || '/wk'}</span></div>
            <p class="text-[11px] text-on-surface-variant font-bold leading-tight opacity-75">Focuses on rain & extreme weather protection</p>
        </div>
      </button>

      <button type="button" onclick="actions.selectTier('premium')" class="${plusSel ? 'bg-gradient-to-br from-[#FFFCF5] to-white border-[#F59E0B] shadow-2xl shadow-amber-500/20 scale-[1.02]' : 'bg-surface-container border-transparent opacity-80 hover:opacity-100'} border border-2 rounded-[2rem] p-5 transition-all duration-300 text-left relative overflow-hidden group">
        ${plusSel ? '<div class="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-bl-full"></div>' : ''}
        <div class="flex justify-between items-start mb-4 relative z-10">
          <span class="${plusSel ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-on-surface/5 text-on-surface-variant border-on-surface/5'} text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm">Premium</span>
          ${plusSel ? '<span class="material-symbols-outlined text-amber-500 text-[24px] drop-shadow-sm animate-pulse" style="font-variation-settings:\'FILL\' 1;">check_circle</span>' : '<div class="w-6 h-6 rounded-full border-2 border-outline-variant/60 shadow-inner"></div>'}
        </div>
        <div class="relative z-10">
            <div class="flex items-baseline font-noto mb-1"><span class="text-2xl font-black text-on-surface shadow-sm">${formatCurrency(premiumAmount)}</span><span class="text-[10px] text-on-surface-variant font-bold opacity-60 ml-1">/wk</span></div>
            <p class="text-[11px] text-on-surface-variant font-bold leading-tight opacity-75">Adds fog, traffic, and platform outage cover</p>
        </div>
      </button>
    </div>

    <section class="mb-10">
      <div class="flex items-center justify-between mb-4 px-1">
        <h3 class="font-headline font-black text-xl text-on-surface tracking-tight">${t('whats_covered') || 'What\'s Covered'}</h3>
        <span class="text-[10px] font-black uppercase text-primary bg-primary/5 border border-primary/10 px-2 py-1 rounded-md">Max ₹4,080 /wk</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${(stdSel ? [
          { icon: 'rainy', label: 'Heavy Rain', color: 'text-primary', payout: 408 },
          { icon: 'foggy', label: 'Dense Fog', color: 'text-slate-500', payout: 408 }
        ] : [
          { icon: 'rainy', label: 'Heavy Rain', color: 'text-primary', payout: 408 },
          { icon: 'air', label: 'Severe AQI', color: 'text-secondary', payout: 510 },
          { icon: 'thermostat', label: 'Heat Wave', color: 'text-orange-500', payout: 612 },
          { icon: 'flood', label: 'Red Alert', color: 'text-red-600', payout: 816 },
          { icon: 'foggy', label: 'Dense Fog', color: 'text-slate-500', payout: 408 },
          { icon: 'lock_clock', label: 'Bandh', color: 'text-on-surface', payout: 816 }
        ]).map(t => `
          <div class="bg-white p-4 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-outline-variant/10 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1">
            <div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center mb-3">
              <span class="material-symbols-outlined ${t.color} text-[18px]">${t.icon}</span>
            </div>
            <span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">${t.label}</span>
            <span class="text-lg font-black text-on-surface">₹${t.payout.toLocaleString('en-IN')}<span class="text-[10px] font-bold opacity-60 ml-1">/event</span></span>
          </div>`).join('')}
      </div>
    </section>
  </main>

  <footer class="mt-auto px-6 py-6 bg-gradient-to-t from-surface via-surface to-transparent pt-12 z-10 sticky bottom-0">
    <div class="space-y-4">
      <button onclick="actions.buyPolicy()" class="btn btn-primary h-20 w-full rounded-[28px] shadow-2xl shadow-primary/30 pointer-events-auto active:scale-95 transition-transform flex items-center px-8">
        <span class="flex-1 text-left font-black uppercase tracking-widest text-sm">${t('buy_weekly') || 'Buy Weekly Cover'}</span>
        <div class="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner">
          <span class="font-black text-lg">${formatCurrency(amt)}</span>
        </div>
      </button>
      <div class="flex items-center justify-center gap-2 text-on-surface-variant opacity-80 pb-2">
        <span class="material-symbols-outlined text-[16px]">autorenew</span>
        <p class="font-body text-[11px] font-medium tracking-tight">${t('autopay_description') || 'Charged every Monday via UPI AutoPay.'}</p>
      </div>
    </div>
  </footer>
</div>`;
}

export function upiScreen(state) {
  const amt = state.premiumAmount;
  const tierLabel = state.tier === 'basic' ? 'Basic' : 'Premium';
  const platLabel = state.platform === 'swiggy' ? 'Swiggy' : state.platform === 'zomato' ? 'Zomato' : 'Both';
  const startDate = state.policy?.startDate || 'Mon 24 Mar';
  const endDate = state.policy?.endDate || 'Sun 30 Mar';

  return `
<div class="min-h-full bg-surface flex flex-col">
  <header class="top-shell flex items-center justify-between px-4 py-3 w-full">
    <div class="flex items-center gap-3">
      <button onclick="actions.goToPremium()" aria-label="Back to premium" class="material-symbols-outlined text-primary active:scale-95 duration-200">arrow_back</button>
      <h1 class="font-headline font-bold text-lg text-on-surface">SecureSync AI</h1>
    </div>
    <div class="flex items-center gap-3">
      <button class="icon-btn" aria-label="Notifications"><span class="material-symbols-outlined text-primary">notifications</span></button>
      ${renderAvatar(state)}
    </div>
  </header>

  <main class="px-4 pt-6 pb-24">
    <section class="mb-6">
      <div class="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_4px_24px_rgba(27,28,28,0.04)] overflow-hidden relative">
        <div class="absolute top-0 right-0 p-4"><span class="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Weekly</span></div>
        <h2 class="text-on-surface-variant font-headline font-bold text-sm mb-4">Order Summary</h2>
        <div class="space-y-4">
          <div>
            <p class="text-on-surface font-headline font-extrabold text-xl">${tierLabel} Weekly Coverage</p>
            <p class="text-on-surface-variant text-sm">${startDate} -> ${endDate}</p>
          </div>
          <div class="flex items-center gap-3 py-3 px-4 bg-surface-container-low rounded-2xl">
            <span class="material-symbols-outlined text-primary">delivery_dining</span>
            <div><p class="text-xs font-semibold text-on-surface-variant uppercase">Platform and Zone</p><p class="text-sm font-bold text-on-surface">${platLabel} · ${state.user.zone} · ${state.user.city}</p></div>
          </div>
          <div class="flex justify-between items-end pt-2 border-t border-dashed border-outline-variant/30">
            <span class="text-on-surface-variant font-semibold">Total Amount</span>
            <span class="text-primary font-headline font-extrabold text-lg tracking-tight"><span class="text-base">₹</span>${amt}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-6">
      <div class="bg-primary-container/5 rounded-3xl p-5 border border-primary-container/10">
        <div class="flex items-start gap-4 mb-6">
          <div class="w-12 h-12 bg-primary-container rounded-2xl flex items-center justify-center text-white shrink-0"><span class="material-symbols-outlined text-3xl" style="font-variation-settings:'FILL' 1;">sync_saved_locally</span></div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-headline font-bold text-lg text-primary">UPI AutoPay</h3>
              <div class="bg-white px-2 py-0.5 rounded-md border border-outline-variant/20"><img alt="Razorpay" class="h-3 opacity-80" src="${RAZORPAY_IMG}"/></div>
            </div>
            <p class="text-on-surface-variant text-sm leading-tight">Charged every Monday automatically. No manual renewal needed.</p>
          </div>
        </div>
        <div class="space-y-4">
          <div class="relative">
            <label class="absolute -top-2 left-4 bg-surface px-1 text-[10px] font-bold text-primary tracking-widest uppercase" for="upi-id-input">Enter UPI ID</label>
            <input id="upi-id-input" aria-label="UPI ID" class="w-full bg-surface-container-lowest border-2 border-primary/20 rounded-2xl px-5 py-4 text-on-surface font-semibold focus:ring-0 focus:border-primary transition-all outline-none placeholder:text-outline-variant" placeholder="mobile-number@upi" type="text"/>
            <div class="absolute right-4 top-1/2 -translate-y-1/2"><span class="material-symbols-outlined text-primary-container" style="font-variation-settings:'FILL' 1;">check_circle</span></div>
          </div>
          <button 
            onclick="actions.activateCoverage()" 
            ${state.purchaseInFlight ? 'disabled' : ''}
            class="w-full bg-surface-container-highest text-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 duration-200 transition-all ${state.purchaseInFlight ? 'opacity-50 pointer-events-none' : ''}"
          >
            ${state.purchaseInFlight ? `<span class="animate-spin material-symbols-outlined">sync</span> ${t('processing')}...` : `<span class="material-symbols-outlined">account_balance_wallet</span>${t('pay_via_upi')}`}
          </button>
          
        </div>
      </div>
    </section>

    <section class="mb-4">
      <div class="flex justify-between items-center px-2">
        <div class="flex flex-col items-center gap-1"><span class="material-symbols-outlined text-on-surface-variant text-lg">encrypted</span><span class="text-[9px] font-bold text-on-surface-variant uppercase text-center leading-none">256-bit<br/>encrypted</span></div>
        <div class="w-px h-6 bg-outline-variant/30"></div>
        <div class="flex flex-col items-center gap-1"><span class="material-symbols-outlined text-on-surface-variant text-lg">account_balance</span><span class="text-[9px] font-bold text-on-surface-variant uppercase text-center leading-none">RBI<br/>compliant</span></div>
        <div class="w-px h-6 bg-outline-variant/30"></div>
        <div class="flex flex-col items-center gap-1"><span class="material-symbols-outlined text-on-surface-variant text-lg">verified_user</span><span class="text-[9px] font-bold text-on-surface-variant uppercase text-center leading-none">Razorpay<br/>secured</span></div>
      </div>
    </section>
  </main>

  <div style="position:sticky;bottom:0;left:0;right:0;z-index:40;padding:12px 16px calc(16px + env(safe-area-inset-bottom));background:linear-gradient(to top,#fcf9f8 60%,rgba(252,249,248,0));">
    <div class="flex gap-2">
      <button 
        onclick="actions.activateCoverage()" 
        ${state.purchaseInFlight ? 'disabled' : ''}
        class="flex-1 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold text-lg py-5 rounded-3xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 haptic-pulse duration-200 ${state.purchaseInFlight ? 'opacity-80' : ''}"
      >
        ${state.purchaseInFlight ? `<span class="animate-spin material-symbols-outlined">sync</span> ${t('processing')}...` : `${t('activate_coverage')} - ₹${amt} <span class="material-symbols-outlined">arrow_forward</span>`}
      </button>
    </div>
  </div>
</div>`;
}

export function confirmationScreen(state) {
  const score = Math.max(0, Math.min(Number(state.user.score || 82), 99));
  const policyId = state.policy?.policy_id || '#SS-8829-IND';
  const startDate = state.policy?.startDate || 'Monday 24 March';
  const endDate = state.policy?.endDate || 'Sunday 30 March';
  const perEvent = state.policy?.maxPayout || 408;

  const triggers = [
    { icon: 'rainy', label: 'Rain', color: 'text-primary-container', payout: 408 },
    { icon: 'air', label: 'AQI', color: 'text-secondary', payout: 510 },
    { icon: 'thermostat', label: 'Heat Wave', color: 'text-orange-500', payout: 408 },
    { icon: 'flood', label: 'Flood', color: 'text-blue-600', payout: 408 },
    { icon: 'foggy', label: 'Fog', color: 'text-slate-400', payout: 408 },
    { icon: 'traffic', label: 'Traffic', color: 'text-red-500', payout: 306 },
    { icon: 'lock_clock', label: 'Curfew', color: 'text-on-surface', payout: 816 },
    { icon: 'cloud_off', label: 'Platform', color: 'text-tertiary', payout: 204 },
  ];

  return `
<div class="min-h-full bg-surface flex flex-col">
  <header class="top-shell">
    <div class="flex items-center justify-between px-4 py-3 w-full">
      <div class="flex items-center gap-3">
        ${renderAvatar(state)}
        <span class="font-headline font-black tracking-tight text-primary text-lg">SecureSync AI</span>
      </div>
      <button class="icon-btn" aria-label="Notifications"><span class="material-symbols-outlined">notifications</span></button>
    </div>
  </header>

  <main class="flex-grow px-4 pb-32 w-full">
    <section class="py-8 text-center space-y-4">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-container/10 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary-container/30 to-transparent rounded-full"></div>
        <span class="material-symbols-outlined text-primary text-4xl relative z-10" style="font-variation-settings:'FILL' 1;">shield_with_heart</span>
      </div>
      <div class="space-y-1">
        <h1 class="text-2xl font-extrabold tracking-tight text-on-surface">Coverage Active</h1>
        <p class="text-on-surface-variant text-sm font-medium">Policy ID: ${policyId}</p>
      </div>
    </section>

    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="bg-surface-container-lowest p-4 rounded-3xl shadow-[0_4px_24px_rgba(27,28,28,0.04)]">
        <p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Period</p>
        <p class="text-sm font-bold text-on-surface leading-tight">${startDate}<br/>${endDate}</p>
      </div>
      <div class="bg-surface-container-lowest p-4 rounded-3xl shadow-[0_4px_24px_rgba(27,28,28,0.04)]">
        <p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Active Zone</p>
        <div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-sm">location_on</span><p class="text-sm font-bold text-on-surface">${state.user.zone} · ${state.user.city}</p></div>
      </div>
    </div>

    <div class="mb-8 flex justify-center">
      <div class="inline-flex items-center gap-3 bg-surface-container-low px-5 py-2.5 rounded-full">
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-tertiary text-white text-xs font-bold">${score}</div>
        <div><span class="text-xs font-bold text-on-surface">Verification Score: Strong</span><p class="text-[10px] text-on-surface-variant leading-none">High reliability discount applied</p></div>
        <span class="material-symbols-outlined text-tertiary text-lg">verified</span>
      </div>
    </div>

    <section class="mb-8">
      <div class="flex items-center justify-between mb-4 px-1">
        <h2 class="text-lg font-bold text-on-surface">8-Point Protection Grid</h2>
        <span class="text-[10px] font-black uppercase text-primary bg-primary/5 px-2 py-1 rounded-md">Max Cap: ₹${Number(state.policy?.maxPayout || 1200).toLocaleString('en-IN')}</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${triggers.map((t) => `
          <div class="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/10 flex flex-col items-center text-center space-y-2">
            <span class="material-symbols-outlined ${t.color}">${t.icon}</span>
            <span class="text-sm font-bold block">${t.label}</span>
            <span class="text-sm font-extrabold text-primary">₹${t.payout.toLocaleString('en-IN')} / event</span>
          </div>`).join('')}
      </div>
    </section>

    <div class="bg-surface-container-lowest p-5 rounded-3xl mb-8 flex items-center justify-between border border-outline-variant/10 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 flex items-center justify-center bg-surface-container rounded-xl overflow-hidden grayscale contrast-125"><img alt="Razorpay" class="w-16 h-auto" src="${RAZORPAY_LOGO}"/></div>
        <div><p class="text-sm font-bold text-on-surface">UPI AutoPay Active</p><p class="text-[10px] text-on-surface-variant">Next billing in 7 days</p></div>
      </div>
      <div class="flex items-center gap-2 bg-tertiary/10 px-3 py-1 rounded-full"><div class="w-2 h-2 rounded-full bg-tertiary"></div><span class="text-[10px] font-bold text-tertiary uppercase tracking-wider">Verified</span></div>
    </div>
  </main>

  <div style="position:sticky;bottom:0;left:0;right:0;z-index:40;padding:12px 16px calc(16px + env(safe-area-inset-bottom));background:linear-gradient(to top,#fcf9f8 60%,rgba(252,249,248,0));">
    <button onclick="actions.goToDashboard()" class="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white rounded-3xl font-bold font-headline flex items-center justify-center gap-2 shadow-lg shadow-primary/20 haptic-pulse transition-all">
      ${t('go_to_dashboard')} <span class="material-symbols-outlined text-lg">arrow_forward</span>
    </button>
  </div>
</div>`;
}
