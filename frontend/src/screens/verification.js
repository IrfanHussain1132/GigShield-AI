// Verification Start and Score screens

const PROFILE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdF9EXjddnq_SOQujAqCIrzQjgJYmUBptDL4Bxyfc7zS_1eirVNzPYZHQ6Ws8a8nK76S37UohBt4KOjkn91TRwOMsG3ypbyPl7WrQplzOUbwyke19vIfSRs5iSL79GRAJkXzLcF6iIAqmy9oyNeaCsyLEJFzkAt6t8nRwY5XksLOvV8AZCuIyO8TYAYb3sUCixHqiUuoNalOcOW_DduVoWr8qiOYsnbA0U3p_rYH4FZmyifdChS_rqqfpNKezygamN3YAIg7aOE2Qf';

function appBar() {
  return `
<header class="top-shell px-6 py-4 flex justify-between items-center w-full">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-full overflow-hidden bg-primary-container/20 flex items-center justify-center">
      <img alt="Worker" class="w-full h-full object-cover" src="${PROFILE_IMG}" />
    </div>
    <h1 class="font-headline font-black tracking-tighter text-primary text-xl">SecureSync AI</h1>
  </div>
  <button class="icon-btn" aria-label="Notifications"><span class="material-symbols-outlined">notifications</span></button>
</header>`;
}

export function verificationStartScreen(state) {
  return `
<div class="min-h-full bg-surface flex flex-col pb-24">
  ${appBar()}

  <section class="px-6 py-5">
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs text-on-primary font-bold">1</div>
        <span class="text-xl font-bold text-on-surface">Partner ID</span>
      </div>
      <div class="flex-1 h-[3px] bg-primary/80 rounded-full"></div>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-primary-container text-xs text-on-primary-container font-bold flex items-center justify-center">2</div>
        <span class="text-xl font-bold text-primary">Confirm Details</span>
      </div>
    </div>
  </section>

  <section class="px-6 py-4 space-y-4">
    <h2 class="font-headline font-bold text-3xl text-on-surface">Select Platform</h2>
    <div class="flex gap-2">
      <button data-plat="swiggy" onclick="actions.selectPlatform('swiggy')" class="plat-btn flex-1 py-3 px-4 rounded-xl ${state.platform === 'swiggy' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container-low text-on-surface-variant'} font-bold text-sm transition-all">Swiggy</button>
      <button data-plat="zomato" onclick="actions.selectPlatform('zomato')" class="plat-btn flex-1 py-3 px-4 rounded-xl ${state.platform === 'zomato' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container-low text-on-surface-variant'} font-medium text-sm transition-all">Zomato</button>
      <button data-plat="both" onclick="actions.selectPlatform('both')" class="plat-btn flex-1 py-3 px-4 rounded-xl ${state.platform === 'both' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container-low text-on-surface-variant'} font-medium text-sm transition-all">Both</button>
    </div>
  </section>

  <section class="px-6 py-4 space-y-4">
    <div class="space-y-2">
      <label class="text-xs font-bold text-outline uppercase tracking-widest" for="partner-id-input">Partner ID Number</label>
      <div class="relative">
        <input id="partner-id-input" aria-label="Partner ID Number" class="w-full h-14 bg-surface-container-lowest border-none rounded-xl px-4 text-on-surface font-semibold focus:ring-2 focus:ring-primary transition-all outline-none" placeholder="e.g. SW-982341" type="text" value="${state.partnerId || ''}" />
        <div class="absolute right-4 top-1/2 -translate-y-1/2 text-primary"><span class="material-symbols-outlined">verified_user</span></div>
      </div>
    </div>

    <details class="group bg-surface-container-low rounded-xl overflow-hidden transition-all">
      <summary class="flex items-center justify-between p-4 cursor-pointer list-none">
        <span class="text-sm font-semibold text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-sm">help</span>Where do I find this?</span>
        <span class="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
      </summary>
      <div class="px-4 pb-4 text-xs text-on-surface-variant leading-relaxed">Open your Partner App, tap profile, and look for the unique alphanumeric code below your name.</div>
    </details>
  </section>

  <section class="px-6 py-4">
    <div class="bg-surface-container-low rounded-[28px] p-8 border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
      <div class="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-primary/40 text-3xl animate-pulse">barcode_scanner</span>
      </div>
      <h3 class="font-headline font-bold text-on-surface mb-1">Awaiting Partner ID</h3>
      <p class="text-on-surface-variant text-xs max-w-[200px]">Verification score will be calculated once your ID is successfully matched.</p>
    </div>
  </section>

  <footer class="mt-auto px-6 py-8">
    <button onclick="actions.verifyPartner()" class="btn btn-primary">
      Verify Partner ID <span class="material-symbols-outlined">arrow_forward</span>
    </button>
  </footer>
</div>`;
}

export function verificationScoreScreen(state) {
  const score = Math.max(0, Math.min(Number(state.user.score || 82), 99));
  const scoreLabel = score >= 90 ? 'Excellent' : score >= 80 ? 'Strong' : score >= 70 ? 'Good' : 'Building';
  const tenure = state.user.tenure || '2 yrs 1 month';
  const zone = state.user.zone || 'Zone 4';
  const potential = score >= 90 ? 1450 : score >= 80 ? 1280 : 980;
  const ringFillDeg = Math.round((score / 100) * 360);

  return `
<div class="min-h-full bg-surface flex flex-col pb-24">
  ${appBar()}

  <section class="px-6 py-5">
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs text-on-primary font-bold"><span class="material-symbols-outlined text-[14px]">check</span></div>
        <span class="text-xl font-bold text-on-surface">Partner ID</span>
      </div>
      <div class="flex-1 h-[3px] bg-primary rounded-full"></div>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-primary-container text-xs text-on-primary-container font-bold flex items-center justify-center">2</div>
        <span class="text-xl font-bold text-primary">Confirm Details</span>
      </div>
    </div>
  </section>

  <section class="px-6 py-4">
    <div class="bg-surface-container-lowest rounded-[28px] p-6 shadow-[0_8px_32px_rgba(0,94,82,0.08)] relative overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      <div class="flex items-center justify-between mb-8">
        <div class="space-y-1">
          <h3 class="font-headline font-bold text-sm text-outline uppercase tracking-wider">Verification Score</h3>
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
    <div class="bg-secondary-container/10 p-5 rounded-xl flex items-center justify-between">
      <div class="space-y-1">
        <p class="text-[10px] font-bold text-on-secondary-container uppercase tracking-widest">Potential Premium Payout</p>
        <p class="font-noto text-2xl font-black text-on-secondary-container"><span class="rupee-symbol text-xl">₹</span>${potential.toLocaleString('en-IN')}</p>
      </div>
      <div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center shadow-lg"><span class="material-symbols-outlined text-on-secondary-container">trending_up</span></div>
    </div>
  </section>

  <footer class="mt-auto px-6 py-8">
    <button onclick="actions.goToPremium()" class="btn btn-primary">
      Looks right - Continue to Premium <span class="material-symbols-outlined">arrow_forward</span>
    </button>
  </footer>
</div>`;
}
