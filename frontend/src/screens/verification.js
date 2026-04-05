// Verification Start and Score screens
import { t, formatCurrency } from '../utils/i18n.js';

const PROFILE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdF9EXjddnq_SOQujAqCIrzQjgJYmUBptDL4Bxyfc7zS_1eirVNzPYZHQ6Ws8a8nK76S37UohBt4KOjkn91TRwOMsG3ypbyPl7WrQplzOUbwyke19vIfSRs5iSL79GRAJkXzLcF6iIAqmy9oyNeaCsyLEJFzkAt6t8nRwY5XksLOvV8AZCuIyO8TYAYb3sUCixHqiUuoNalOcOW_DduVoWr8qiOYsnbA0U3p_rYH4FZmyifdChS_rqqfpNKezygamN3YAIg7aOE2Qf';

const DEMO_PARTNER_IDS = {
  swiggy: ['SW-982341', 'SW-223344', 'SW-667788'],
  zomato: ['ZM-112233', 'ZM-556677', 'ZM-445521'],
};

function demoIdChips(state) {
  const platform = state.platform === 'zomato' ? 'zomato' : 'swiggy';
  const ids = DEMO_PARTNER_IDS[platform];
  return `
  <div class="bg-surface-container-lowest rounded-[20px] p-4 border border-outline-variant/20 shadow-sm">
    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-3">Demo Partner IDs (tap to fill)</p>
    <div class="flex flex-wrap gap-2">
      ${ids.map((id) => `<button type="button" onclick="actions.prefillPartnerId('${id}')" class="px-3 py-2 rounded-xl bg-white border border-outline-variant/20 text-xs font-black tracking-wide text-primary hover:bg-primary/[0.04] transition-colors">${id}</button>`).join('')}
    </div>
  </div>`;
}

function appBar(state) {
  const name = state.user?.name || 'Partner';
  return `
<header class="top-shell px-6 py-4 flex justify-between items-center w-full border-b border-outline-variant/10 bg-white/60 backdrop-blur-md">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white font-black text-lg shadow-lg border border-white/20">
      ${name.charAt(0).toUpperCase()}
    </div>
    <h1 class="font-headline font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container text-xl drop-shadow-sm">SecureSync AI</h1>
  </div>
  <button class="icon-btn" aria-label="Notifications"><span class="material-symbols-outlined text-outline">notifications</span></button>
</header>`;
}

export function verificationStartScreen(state) {
  return `
<div class="min-h-full bg-[#fdfcfb] flex flex-col pb-32">
  ${appBar(state)}

  <section class="px-6 py-6">
    <div class="flex items-center gap-2 mb-10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm text-on-primary font-black shadow-lg shadow-primary/20 ring-4 ring-primary/5">1</div>
        <span class="text-xl font-headline font-black text-on-surface tracking-tight">${t('partner_id')}</span>
      </div>
      <div class="flex-1 h-[2px] bg-outline-variant/30 rounded-full mx-2">
         <div class="h-full bg-primary rounded-full w-1/3 shadow-[0_0_8px_rgba(0,94,82,0.3)]"></div>
      </div>
      <div class="flex items-center gap-3 opacity-20">
        <div class="w-10 h-10 rounded-full bg-surface-container-highest text-sm text-on-surface-variant font-black flex items-center justify-center">2</div>
        <span class="text-lg font-headline font-bold text-on-surface-variant">${t('confirm_details')}</span>
      </div>
    </div>

    <div class="space-y-10">
      <div class="space-y-4">
        <div class="flex items-end justify-between px-1">
          <h2 class="font-headline font-black text-2xl text-on-surface tracking-tight">${t('select_platform')}</h2>
          <span class="text-[10px] font-bold text-outline uppercase tracking-widest bg-surface-container-high px-2 py-0.5 rounded-full">Required</span>
        </div>
        <div class="grid grid-cols-2 gap-4 p-2 bg-gradient-to-b from-white to-surface-container-lowest rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-outline-variant/20">
          <button data-plat="swiggy" onclick="actions.selectPlatform('swiggy')" 
            class="plat-btn relative group h-14 rounded-[22px] overflow-hidden transition-all duration-500 shadow-sm ${state.platform === 'swiggy' ? 'bg-gradient-to-tr from-orange-500 to-orange-400 text-white shadow-xl shadow-orange-500/20' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-higher'} ">
            <span class="relative z-10 font-black text-sm uppercase tracking-widest drop-shadow-sm">Swiggy</span>
            ${state.platform === 'swiggy' ? '<div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>' : ''}
          </button>
          <button data-plat="zomato" onclick="actions.selectPlatform('zomato')" 
            class="plat-btn relative group h-14 rounded-[22px] overflow-hidden transition-all duration-500 shadow-sm ${state.platform === 'zomato' ? 'bg-gradient-to-tr from-red-600 to-red-500 text-white shadow-xl shadow-red-600/20' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-higher'} ">
            <span class="relative z-10 font-black text-sm uppercase tracking-widest drop-shadow-sm">Zomato</span>
            ${state.platform === 'zomato' ? '<div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>' : ''}
          </button>
        </div>
      </div>

      <div class="space-y-4">
        <div class="flex items-center justify-between px-1">
          <label class="text-[10px] font-black text-outline uppercase tracking-[0.2em]" for="partner-id-input">${t('partner_id_label')}</label>
          <button class="text-[10px] font-bold text-primary uppercase underline underline-offset-4 decoration-primary/30" onclick="document.getElementById('id-guide').classList.toggle('hidden')">${t('where_find')}</button>
        </div>
        <div class="relative group">
          <input id="partner-id-input" aria-label="Partner ID Number" 
            class="w-full h-18 bg-white border-2 border-outline-variant/10 group-focus-within:border-primary/40 rounded-[24px] px-8 text-on-surface font-black text-2xl placeholder:text-outline/20 transition-all outline-none shadow-sm focus:shadow-2xl focus:shadow-primary/5 tracking-wider" 
            placeholder="e.g. ${state.platform === 'zomato' ? 'ZM-556677' : 'SW-982341'}" type="text" value="${state.partnerId || ''}" 
            oninput="state.partnerId = this.value"/>
          <div class="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <div id="id-status-indicator" class="w-1.5 h-1.5 rounded-full ${state.partnerId ? 'bg-primary animate-pulse' : 'bg-outline-variant'}"></div>
            <span class="material-symbols-outlined text-2xl text-primary/30 group-focus-within:text-primary transition-colors">fingerprint</span>
          </div>
        </div>
        ${demoIdChips(state)}
        <div id="id-guide" class="hidden animate-in fade-in slide-in-from-top-2 bg-primary/[0.03] p-5 rounded-[24px] text-xs font-semibold text-primary/70 leading-relaxed border border-primary/10">
          <div class="flex items-start gap-3">
             <span class="material-symbols-outlined text-lg mt-0.5">info</span>
             <p>${t('find_id_desc') || 'Open your Partner App, tap profile, and look for the unique alphanumeric code below your name.'}</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="px-6 py-6 mt-auto">
    <div class="bg-gradient-to-br from-white to-surface-container-lowest rounded-[40px] p-10 border border-primary/5 shadow-[0_12px_40px_rgba(0,94,82,0.05)] flex flex-col items-center justify-center text-center relative overflow-hidden group">
      <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      <div class="w-24 h-24 rounded-[32px] bg-primary/[0.04] flex items-center justify-center mb-8 relative transition-transform group-hover:scale-110 duration-500">
        <div class="absolute inset-0 rounded-[32px] border-2 border-dashed border-primary/30 animate-[spin_10s_linear_infinite]"></div>
        <span class="material-symbols-outlined text-primary text-5xl">verified</span>
      </div>
      <h3 class="font-headline font-black text-2xl text-on-surface mb-3">${t('awaiting_partner_id')}</h3>
      <p class="text-outline font-medium text-sm max-w-[260px] leading-relaxed">${t('verification_score_calc_desc') || 'Verification score will be calculated once your ID is successfully matched.'}</p>
    </div>
  </section>

  <footer class="sticky bottom-0 px-6 py-8 bg-gradient-to-t from-[#fdfcfb] via-[#fdfcfb] to-transparent pointer-events-none">
    <button onclick="actions.verifyPartner()" class="btn btn-primary h-20 rounded-[28px] shadow-2xl shadow-primary/30 pointer-events-auto active:scale-95 transition-transform flex items-center px-8">
      <span class="flex-1 text-left font-black uppercase tracking-widest text-sm">${t('verify_partner_id')}</span>
      <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
        <span class="material-symbols-outlined">arrow_forward</span>
      </div>
    </button>
  </footer>
</div>`;
}

export function verificationScoreScreen(state) {
  const score = Math.max(0, Math.min(Number(state.user.score || 82), 99));
  const scoreLabel = t(score >= 90 ? 'excellent' : score >= 80 ? 'strong' : score >= 70 ? 'good' : 'building');
  const tenureMonths = state.user.tenureMonths || 25;
  const tenure = state.user.tenureMonths ? `${Math.floor(tenureMonths / 12)} yrs ${tenureMonths % 12} months` : '2 yrs 1 month';
  const zone = state.user.zone || 'Zone 4';
  const basePotential = state.user.weeklyIncome ? Math.floor(state.user.weeklyIncome * 0.23) : 1350;
  const potential = score >= 90 ? basePotential + 100 : score >= 80 ? basePotential : basePotential - 150;
  const ringFillDeg = Math.round((score / 100) * 360);

  return `
<div class="min-h-full bg-surface flex flex-col pb-24">
  ${appBar(state)}

  <section class="px-6 py-5">
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs text-on-primary font-bold"><span class="material-symbols-outlined text-[14px]">check</span></div>
        <span class="text-xl font-bold text-on-surface">${t('partner_id')}</span>
      </div>
      <div class="flex-1 h-[3px] bg-primary rounded-full"></div>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-primary-container text-xs text-on-primary-container font-bold flex items-center justify-center">2</div>
        <span class="text-xl font-bold text-primary">${t('confirm_details')}</span>
      </div>
    </div>
  </section>

  <section class="px-6 py-4">
    <div class="bg-surface-container-lowest rounded-[28px] p-6 shadow-[0_8px_32px_rgba(0,94,82,0.08)] relative overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      <div class="flex items-center justify-between mb-8">
        <div class="space-y-1">
          <h3 class="font-headline font-bold text-sm text-outline uppercase tracking-wider">${t('verification_score')}</h3>
          <p class="text-2xl font-black text-primary tracking-tight">${scoreLabel}</p>
        </div>
        <div class="score-ring" style="--ring-fill:${ringFillDeg}deg;"><span class="score-ring-value">${score}</span></div>
      </div>
      <div class="space-y-4">
        <div class="flex items-center justify-between py-1"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary"><span class="material-symbols-outlined text-lg">check_circle</span></div><span class="text-sm font-medium text-on-surface">${state.user.name || 'Partner'} confirmed</span></div><span class="text-xs font-bold text-tertiary uppercase">Verified</span></div>
        <div class="flex items-center justify-between py-1"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined text-lg">calendar_today</span></div><span class="text-sm font-medium text-on-surface">Tenure (${tenure})</span></div><span class="text-xs font-bold text-primary uppercase">Strong</span></div>
        <div class="flex items-center justify-between py-1"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined text-lg">location_on</span></div><span class="text-sm font-medium text-on-surface">${zone} confirmed</span></div><span class="text-xs font-bold text-primary uppercase">Active</span></div>
        <div class="flex items-center justify-between py-1"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined text-lg">delivery_dining</span></div><span class="text-sm font-medium text-on-surface">Delivery activity</span></div><span class="text-xs font-bold text-primary uppercase">High</span></div>
        <div class="flex items-center justify-between py-1"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary"><span class="material-symbols-outlined text-lg">phonelink_setup</span></div><span class="text-sm font-medium text-on-surface">Device fingerprint</span></div><span class="text-xs font-bold text-secondary uppercase">Secure</span></div>
      </div>
    </div>
  </section>

  <section class="px-6 py-4">
    <div class="bg-gradient-to-r from-secondary-container/20 to-transparent p-5 rounded-[24px] flex items-center justify-between border border-secondary-container/20 shadow-sm relative overflow-hidden group">
      <div class="absolute inset-0 bg-white/40 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      <div class="space-y-1 relative z-10">
        <p class="text-[10px] font-bold text-on-secondary-container uppercase tracking-widest">${t('potential_payout') || 'Potential Premium Payout'}</p>
        <p class="font-noto text-2xl font-black text-on-secondary-container drop-shadow-sm">${formatCurrency(potential)}</p>
      </div>
      <div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center shadow-lg relative z-10"><span class="material-symbols-outlined text-on-secondary-container">trending_up</span></div>
    </div>
  </section>

  <footer class="mt-auto px-6 py-8 bg-gradient-to-t from-surface via-surface to-transparent shadow-[0_-20px_40px_rgba(252,249,248,0.9)] z-10 sticky bottom-0">
    <button onclick="actions.goToPremium()" class="btn btn-primary h-20 rounded-[28px] shadow-2xl shadow-primary/30 pointer-events-auto active:scale-95 transition-transform flex items-center px-8 w-full">
      <span class="flex-1 text-left font-black uppercase tracking-widest text-sm">${t('looks_right_continue') || 'Looks Right - Continue'}</span>
      <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-inner">
        <span class="material-symbols-outlined">arrow_forward</span>
      </div>
    </button>
  </footer>
</div>`;
}
