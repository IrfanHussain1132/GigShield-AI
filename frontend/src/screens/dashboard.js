// Dashboard, Coverage, Live Zone, Payouts, Celebration, and Account screens
import { t, supportedLanguages, formatCurrency } from '../utils/i18n.js';

export function homeScreen(state) {
  const name = state.user.name || 'Partner';
  const dash = state.dashboard || { has_active_policy: false, today_earnings: 0, month_total: 0, policy_streak: 0 };
  const weather = state.weather;
  const zone = dash.zone || state.user.zone || 'Zone 4';
  const city = dash.city || state.user.city || 'South Chennai';
  const safetyScore = Math.max(0, Math.min(Number(dash.score || state.user.score || 82), 99));
  const ringFillDeg = Math.round((safetyScore / 100) * 360);
  const hourlyForecast = Array.isArray(state.riskForecast) && state.riskForecast.length
    ? state.riskForecast
    : [
      { time: '2 PM', probability: 12, icon: 'sunny' },
      { time: '3 PM', probability: 45, icon: 'cloud' },
      { time: '4 PM', probability: 78, icon: 'thunderstorm' },
    ];

  const topRisk = hourlyForecast.reduce((peak, item) => (
    Number(item?.probability || 0) > Number(peak?.probability || 0) ? item : peak
  ), hourlyForecast[0]);

  const rainMm = Number(weather?.rain_mm || 0);
  const aqi = Number(weather?.aqi || 0);
  const hasActiveAlert = Boolean(dash.has_active_policy) && (
    rainMm >= 60 || aqi >= 180 || Number(topRisk?.probability || 0) >= 70
  );

  const activePayoutAmount = Number(dash.insurance_payout || 0) > 0 ? Number(dash.insurance_payout) : 408;
  const payoutProgress = Math.max(32, Math.min(92, Math.round(Number(topRisk?.probability || 52) + 10)));

  const weatherItems = weather ? [
    { icon: 'rainy', tone: 'text-error', label: `${weather.rain_mm}mm`, subtitle: t('rain') },
    { icon: 'air', tone: 'text-secondary', label: `AQI ${weather.aqi}`, subtitle: t('air') },
    { icon: 'thermostat', tone: 'text-primary', label: `${weather.temp_c}°C`, subtitle: t('temp') },
    { icon: 'visibility', tone: 'text-on-surface-variant', label: `${weather.visibility_km}km`, subtitle: t('view') },
  ] : null;

  const weatherStrip = weatherItems ? `
    <div class="grid grid-cols-4 gap-1">
      ${weatherItems.map((item, index) => `
        <div class="flex items-center justify-center gap-1.5 px-1 py-1.5 ${index < weatherItems.length - 1 ? 'border-r border-outline-variant/20' : ''}">
          <span class="material-symbols-outlined text-[18px] ${item.tone}">${item.icon}</span>
          <div>
            <p class="text-[9px] font-bold uppercase tracking-wider text-outline leading-none">${item.subtitle}</p>
            <p class="text-[11px] font-black text-on-surface leading-tight">${item.label}</p>
          </div>
        </div>
      `).join('')}
    </div>` : `
    <div class="grid grid-cols-4 gap-2 animate-pulse">
      <div class="h-9 bg-surface-container-high rounded-xl"></div>
      <div class="h-9 bg-surface-container-high rounded-xl"></div>
      <div class="h-9 bg-surface-container-high rounded-xl"></div>
      <div class="h-9 bg-surface-container-high rounded-xl"></div>
    </div>`;

  const alertCard = hasActiveAlert ? `
    <section class="dashboard-alert-card bg-[#084d45] text-white rounded-[30px] p-5 border-l-[5px] border-secondary-fixed-dim shadow-[0_10px_28px_rgba(0,68,60,0.34)]">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-2xl bg-secondary-fixed-dim/20 border border-secondary-fixed-dim/25 flex items-center justify-center">
            <span class="material-symbols-outlined text-secondary-fixed-dim text-[22px]">warning</span>
          </div>
          <div>
            <p class="font-headline font-bold text-[32px] leading-none mb-0.5">${formatCurrency(activePayoutAmount)}</p>
            <h3 class="font-headline font-extrabold text-[20px] leading-tight">Heavy weather trigger in ${zone}</h3>
            <p class="text-[12px] text-white/80 mt-1">Verified by WeatherGrid · Live sync</p>
          </div>
        </div>
        <button class="px-3 py-1.5 rounded-xl border border-white/25 text-[11px] font-bold bg-white/10">Details</button>
      </div>
      <div class="mt-4 flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
        <span class="text-white/85">${t('payout_in_progress') || 'Payout in progress'}</span>
        <span class="text-secondary-fixed-dim flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim animate-pulse"></span>${t('transferring') || 'Transferring'}</span>
      </div>
      <div class="mt-2 h-2 rounded-full bg-white/15 overflow-hidden">
        <div class="h-full bg-gradient-to-r from-secondary-fixed-dim to-secondary-container rounded-full" style="width:${payoutProgress}%;"></div>
      </div>
      <div class="mt-3 flex items-center gap-2 text-[12px] text-white/90 font-semibold">
        <span class="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">verified</span>
        <span>${t('fraud_checks_passed') || 'Fraud checks passed'}</span>
      </div>
    </section>` : '';

  const riskTiles = hourlyForecast.slice(0, 3).map((item) => {
    const isPeak = Number(item?.probability || 0) >= 70;
    return `
      <div class="rounded-[26px] p-4 flex flex-col items-center justify-center transition-all ${isPeak ? 'bg-gradient-to-br from-secondary-container to-[#ffefd6] text-on-secondary-container shadow-[0_8px_20px_rgba(126,87,0,0.15)] ring-2 ring-secondary-fixed-dim/30 hover:-translate-y-1 relative overflow-hidden' : 'bg-surface-container-low text-on-surface border border-outline-variant/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:bg-white hover:shadow-md hover:-translate-y-0.5'}">
        ${isPeak ? '<div class="absolute inset-0 bg-white/20"></div>' : ''}
        <p class="text-[11px] font-black uppercase tracking-widest ${isPeak ? 'text-on-secondary-container/80' : 'text-outline'} relative z-10">${item.time || 'Now'}</p>
        <div class="my-2.5 relative z-10"><span class="material-symbols-outlined text-[32px] drop-shadow-sm ${isPeak ? 'text-on-secondary-container' : 'text-primary'}" style="font-variation-settings: 'FILL' 1;">${item.icon || 'partly_cloudy_day'}</span></div>
        <p class="text-[28px] font-headline font-black leading-none tracking-tighter relative z-10">${item.probability || 0}<span class="text-sm font-bold opacity-60 ml-0.5">%</span></p>
      </div>`;
  }).join('');

  return `
<div class="min-h-full bg-stone-50/50 flex flex-col pb-32">
  <header class="top-shell px-6 py-4 flex justify-between items-center">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-lg shadow-sm border border-white/20">
        ${name.charAt(0).toUpperCase()}
      </div>
      <div><h1 class="text-xs font-bold text-outline uppercase tracking-tighter">${t('good_morning')}</h1><p class="font-headline font-black text-lg text-on-surface leading-tight">${name}</p></div>
    </div>
    <div class="flex items-center gap-2">
      <button class="icon-btn" aria-label="Notifications"><span class="material-symbols-outlined">notifications</span></button>
      <button onclick="actions.logout()" class="icon-btn" aria-label="Log out"><span class="material-symbols-outlined">logout</span></button>
    </div>
  </header>

  <main class="px-4 pt-6 space-y-6">
    <section class="bg-surface-container-lowest rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-outline-variant/10 relative overflow-hidden">
      <div class="absolute right-[-48px] top-[-48px] w-40 h-40 bg-primary/5 rounded-full"></div>
      <div class="relative z-10 flex justify-between items-start mb-6 gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-container/14 border border-primary/10 text-[10px] font-black tracking-widest uppercase text-primary mb-3">
            <span class="w-1.5 h-1.5 rounded-full bg-primary ${dash.has_active_policy ? 'animate-pulse' : ''}"></span>
            ${dash.has_active_policy ? t('coverage_active') : t('coverage_inactive')}
          </span>
          <h2 class="font-headline font-black text-3xl leading-none tracking-tight text-on-surface">${zone}</h2>
          <p class="text-on-surface-variant text-lg font-body font-semibold leading-tight mt-1">${city}</p>
        </div>
        <div class="pt-1 text-center">
          <div class="w-20 h-20 rounded-full p-[7px]" style="background:conic-gradient(#005e52 ${ringFillDeg}deg,#dce5e2 0deg)">
            <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-black text-primary">${safetyScore}</div>
          </div>
          <p class="text-[10px] font-black text-outline uppercase tracking-[0.14em] mt-2">${t('safety_score')}</p>
        </div>
      </div>
      <div class="relative z-10 mt-1 bg-surface-container-low p-3 rounded-3xl border border-outline-variant/10">
        ${weatherStrip}
      </div>
      <div class="relative z-10 mt-4 bg-surface-container-low p-4 rounded-3xl flex items-center justify-between border border-outline-variant/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white"><span class="material-symbols-outlined">shield</span></div>
          <div>
            <p class="text-[10px] font-bold text-outline uppercase leading-none mb-1">${t('coverage_status') || 'Coverage Status'}</p>
            <p class="text-sm font-bold text-on-surface">${dash.has_active_policy ? t('neural_shield') : t('protection_inactive')}</p>
          </div>
        </div>
        ${dash.has_active_policy ? '<span class="material-symbols-outlined text-primary" style="font-variation-settings:\'FILL\' 1;">verified</span>' : `<button onclick="actions.goToPremium()" class="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-full">${t('activate')}</button>`}
      </div>
    </section>

    ${alertCard}

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/10">
        <p class="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">${t('this_month')}</p>
        <div class="flex items-baseline gap-1"><span class="text-2xl font-black text-on-surface">${formatCurrency(dash.month_total || 0)}</span></div>
        <div class="flex items-center gap-1 mt-2 text-[10px] text-tertiary font-bold"><span class="material-symbols-outlined text-xs">check_circle</span><span>${dash.has_active_policy ? t('paid_out') || 'Paid out' : t('awaiting_policy') || 'Awaiting policy'}</span></div>
      </div>
      <div class="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/10">
        <p class="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">${t('policy_streak')}</p>
        <div class="flex items-baseline gap-1"><span class="text-2xl font-black text-on-surface">${dash.policy_streak || 0}</span><span class="text-xs font-bold text-outline">${t('weeks')}</span></div>
        <div class="flex items-center gap-1 mt-2 text-[10px] text-primary font-bold"><span class="material-symbols-outlined text-xs">military_tech</span><span>${t('shield_level')} ${Math.min(5, Math.max(1, Math.ceil((dash.policy_streak || 0) / 2)))}</span></div>
      </div>
    </div>

    <section class="bg-gradient-to-br from-[#006457] via-[#005247] to-[#003b33] text-white rounded-[32px] p-6 relative overflow-hidden shadow-xl shadow-primary/15">
      <div class="absolute inset-0 dashboard-dot-grid opacity-25"></div>
      <div class="absolute -right-8 -bottom-10 text-white/10"><span class="material-symbols-outlined text-[180px]">payments</span></div>
      <div class="relative z-10 flex justify-between items-start mb-4">
        <div><h3 class="font-headline font-bold text-lg mb-1">${t('today_earnings')}</h3><p class="text-white/70 text-xs">${t('earnings_estimate_desc') || 'Trigger-adjusted estimate'}</p></div>
        <div class="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div><span class="text-[10px] font-bold uppercase tracking-widest">${t('live')}</span></div>
      </div>
      <div class="relative z-10 flex items-baseline gap-2 mb-5"><span class="font-headline font-black text-4xl tracking-tighter">${formatCurrency(dash.today_earnings || 0)}</span></div>
      <div class="relative z-10 flex items-center gap-3 mb-5">
        <span class="px-4 py-2 rounded-full bg-white/12 border border-white/15 text-sm font-bold">8 hrs active</span>
        <span class="px-4 py-2 rounded-full bg-white/12 border border-white/15 text-sm font-bold text-tertiary-fixed-dim">+12%</span>
      </div>
      <button onclick="actions.goToPayouts()" class="relative z-10 w-full bg-white/20 hover:bg-white/30 backdrop-blur-md py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">${t('view_history')} <span class="material-symbols-outlined">history</span></button>
    </section>

    <section>
      <div class="flex items-center justify-between mb-3 px-1">
        <h3 class="font-headline font-black text-2xl tracking-tight text-on-surface">${t('risk_forecast')}</h3>
        <button onclick="actions.loadZoneDetails()" class="text-primary text-xs font-black uppercase tracking-wider">${t('next_6_hours')}</button>
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${riskTiles}
      </div>
    </section>

    <!-- Phase 3: LSTM 72-Hour Predictive Forecast -->
    <section class="bg-surface-container-lowest rounded-[32px] p-6 shadow-sm border border-outline-variant/10 relative overflow-hidden group">
      <div class="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full transition-transform duration-700 group-hover:scale-110"></div>
      <div class="relative z-10">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/5">
              <span class="material-symbols-outlined text-primary text-[20px]">psychology</span>
            </div>
            <div>
               <h3 class="font-headline font-black text-xl tracking-tight text-on-surface leading-none mb-1">${t('ai_forecast')}</h3>
               <p class="text-[9px] font-black text-outline uppercase tracking-[0.2em]">LSTM 72-Hr Neural Forecast</p>
            </div>
          </div>
        </div>
        
        <div id="forecast-alert-strip" class="bg-surface-container rounded-[24px] p-5 mb-5 shadow-inner border border-outline-variant/10">
          <div class="flex items-start gap-4 mb-5">
            <div class="w-12 h-12 shrink-0 rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center border border-outline-variant/10">
              <span class="material-symbols-outlined text-primary drop-shadow-sm text-[24px]" style="font-variation-settings: 'FILL' 1;">troubleshoot</span>
            </div>
            <div class="pt-1">
              <p class="text-[14px] font-bold text-on-surface leading-snug" id="forecast-msg">${state.forecastAlert?.message || '<span class="text-primary material-symbols-outlined text-[16px] align-text-bottom mr-1" style="font-variation-settings: \'FILL\' 1;">check_circle</span>Low disruption risk for the next 72 hours.'}</p>
              <p class="text-[10px] font-bold text-outline uppercase tracking-wider mt-2">${state.forecastAlert?.red_hours_72h || 0} red hours · ${state.forecastAlert?.orange_hours_72h || 0} elevated hrs in 72h</p>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-white rounded-2xl p-3 text-center shadow-sm border border-outline-variant/5 hover:shadow-md transition-shadow">
              <p class="text-[9px] font-black text-outline uppercase tracking-wider mb-1">6hr Risk</p>
              <p class="text-xl font-headline font-black text-on-surface tracking-tighter">${state.forecastAlert?.risk_percentage || 12}<span class="text-xs ml-0.5 opacity-60">%</span></p>
            </div>
            <div class="bg-white rounded-2xl p-3 text-center shadow-sm border border-outline-variant/5 hover:shadow-md transition-shadow">
              <p class="text-[9px] font-black text-outline uppercase tracking-wider mb-1">Model</p>
              <p class="text-sm font-headline font-black text-on-surface mt-1.5 opacity-90">LSTM v3</p>
            </div>
            <div class="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-3 text-center shadow-sm border border-primary/20">
              <p class="text-[9px] font-black text-primary uppercase tracking-wider mb-1">${t('coverage')}</p>
              <p class="text-sm font-headline font-black text-primary drop-shadow-sm mt-1.5">${t('active') || 'Active'}</p>
            </div>
          </div>
        </div>
        
        <button onclick="actions.loadZoneDetails()" class="w-full bg-white hover:bg-surface-container-low text-primary py-4 rounded-[20px] font-black uppercase text-[11px] tracking-[0.15em] flex items-center justify-center gap-2 transition-all border border-outline-variant/20 shadow-[0_4px_14px_rgba(0,0,0,0.03)] active:scale-95 group">
          ${t('view_72h')} <span class="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </button>
    </section>

    <!-- Phase 3: Live Disruption Zone Map -->
    <section class="bg-[#0b131e] rounded-[32px] p-7 relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.15)] ring-1 ring-white/10 mt-6">
      <div class="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent"></div>
      <div class="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
      <div class="relative z-10">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="font-headline font-black text-xl text-white tracking-tight leading-none mb-1.5">Live Disruption Map</h3>
            <p class="text-white/40 text-[11px] font-bold tracking-widest uppercase">6 zones · Real-time feed</p>
          </div>
          <div class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/20"></div>
            <span class="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em]">Live</span>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2.5">
          ${Object.entries({
            'Zone 1': {city: 'Chennai C.', risk: 'low'},
            'Zone 2': {city: 'Hyderabad', risk: 'low'},
            'Zone 3': {city: 'Delhi', risk: 'med'},
            'Zone 4': {city: 'Chennai S.', risk: zone === 'Zone 4' ? 'active' : 'low'},
            'Zone 5': {city: 'Mumbai', risk: 'low'},
            'Zone 6': {city: 'Bengaluru', risk: 'low'},
          }).map(([z, info]) => {
            const isActive = z === zone;
            const bgClass = isActive ? 'bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : info.risk === 'med' ? 'bg-amber-500/15 border-amber-500/30' : 'bg-white/5 border-white/10';
            const dotClass = isActive ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : info.risk === 'med' ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-white/20';
            const pulseClass = isActive ? 'animate-pulse' : '';
            return '<div class="aspect-square rounded-full border ' + bgClass + ' text-center flex flex-col items-center justify-center transition-all duration-500 shadow-lg">'
              + '<div class="w-1.5 h-1.5 rounded-full ' + dotClass + ' mb-1 ' + pulseClass + '"></div>'
              + '<p class="text-[12px] font-black tracking-widest text-white">' + z.replace('Zone ', 'Z') + '</p>'
              + '<p class="text-[7px] text-white/50 font-bold uppercase tracking-tighter">' + info.city + '</p>'
              + '</div>';
          }).join('')}
        </div>
        <div class="mt-5 flex items-center gap-5 justify-center text-[9px] text-white/40 font-bold uppercase tracking-widest">
          <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>Yours</span>
          <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>Elevated</span>
        </div>
      </div>
    </section>
  </main>
</div>`;
}

export function coverageScreen(state) {
  const policy = state.policy;
  const status = policy ? 'ACTIVE' : 'NO POLICY';
  const isPremium = state.tier === 'premium';
  // Triggers per Policy Reference §3.2 and §5
  const triggers = [
    { label: 'Heavy Rain', icon: 'rainy', threshold: '≥64.5 mm/day (IMD)', payout: '₹408 / 4hrs', color: 'text-primary-container', plans: 'both' },
    { label: 'Very Heavy Rain', icon: 'thunderstorm', threshold: '≥124.5 mm/day', payout: '₹612 / 6hrs', color: 'text-blue-600', plans: 'both' },
    { label: 'Dense Fog', icon: 'foggy', threshold: '<200m visibility', payout: '₹408 / 4hrs', color: 'text-slate-400', plans: 'both' },
    { label: 'Gridlock', icon: 'traffic', threshold: '≤8 km/h peak hrs', payout: '₹306 / 3hrs', color: 'text-red-500', plans: 'both' },
    { label: 'Heat Wave', icon: 'thermostat', threshold: '≥40°C (IMD)', payout: '₹408 / 4hrs', color: 'text-amber-500', plans: 'premium' },
    { label: 'Severe AQI', icon: 'air', threshold: 'AQI 301–400 (CPCB)', payout: '₹510 / 5hrs', color: 'text-secondary', plans: 'premium' },
    { label: 'AQI Severe', icon: 'air', threshold: 'AQI 401–500', payout: '₹612 / 6hrs', color: 'text-red-500', plans: 'premium' },
    { label: 'Bandh / Curfew', icon: 'lock_clock', threshold: '2 of 3 sources', payout: '₹816 / 8hrs', color: 'text-on-surface', plans: 'premium' },
    { label: 'Platform Outage', icon: 'cloud_off', threshold: '>2 hrs confirmed', payout: '₹102 × hrs', color: 'text-tertiary', plans: 'premium' },
  ];
  const visibleTriggers = isPremium ? triggers : triggers.filter(t => t.plans === 'both');
  const maxWeekly = isPremium ? '4,080' : '816';

  return `
<div class="min-h-full bg-surface flex flex-col pb-32">
  <header class="top-shell px-6 py-4">
    <h1 class="font-headline font-black text-2xl text-on-surface">Coverage Active</h1>
    <p class="text-on-surface-variant text-sm">${status} · ${state.user.zone || 'Zone 4'} · ${state.user.city || 'South Chennai'}</p>
  </header>
  <main class="px-4 pt-6 space-y-6">
    <div class="bg-surface-container-low rounded-3xl p-5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">${Math.max(0, Math.min(Number(state.user.score || 82), 99))}</div>
        <div>
          <p class="font-bold text-on-surface">Verification Score: Strong</p>
          <p class="text-xs text-on-surface-variant">High reliability discount applied</p>
        </div>
      </div>
      <span class="material-symbols-outlined text-tertiary">verified</span>
    </div>

    <!-- Payout formula info — §3.1 -->
    <div class="bg-primary/5 rounded-2xl p-4 border border-primary/10">
      <p class="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Core payout formula (§3.1)</p>
      <p class="font-headline font-bold text-on-surface">Payout = ₹102 × Disruption Hours</p>
      <p class="text-xs text-on-surface-variant mt-1">Rate: ₹102/hr (Zomato CEO Disclosure, Jan 2026)</p>
    </div>

    <div class="flex items-center justify-between mb-4 px-1">
      <h2 class="font-headline font-black text-2xl tracking-tight text-on-surface">Covered Triggers</h2>
      <span class="text-[10px] font-black uppercase text-primary bg-primary-container/10 px-2 py-1 rounded-md">Max/week: ₹${maxWeekly}</span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      ${visibleTriggers.map((t) => `
        <div class="bg-surface-container-lowest p-5 rounded-[24px] border border-outline-variant/10 shadow-sm text-center${t.plans === 'premium' ? ' relative' : ''}">
          ${t.plans === 'premium' ? '<span class="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-secondary/10 text-secondary rounded">Premium</span>' : ''}
          <span class="material-symbols-outlined ${t.color} text-3xl">${t.icon}</span>
          <p class="font-headline font-bold text-lg mt-2">${t.label}</p>
          <p class="text-xs text-on-surface-variant mt-1">${t.threshold}</p>
          <p class="text-primary font-bold mt-2">${t.payout}</p>
        </div>
      `).join('')}
    </div>

    <button onclick="actions.goToDashboard()" class="btn btn-primary">Go to Dashboard <span class="material-symbols-outlined">arrow_forward</span></button>
  </main>
</div>`;
}

export function liveZoneScreen(state) {
  const data = state.zoneData || { rain_mm: 0, aqi: 88, temp_c: 31, visibility_km: 4.2, wind_kmh: 14 };
  const risk = Number(data.rain_mm || 0) > 10 || Number(data.aqi || 0) > 200;

  return `
<div class="min-h-full bg-surface flex flex-col pb-32">
  <header class="top-shell px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <button onclick="actions.goToDashboard()" aria-label="Back to dashboard" class="material-symbols-outlined text-primary rounded-full p-1.5">arrow_back</button>
      <h1 class="font-headline font-black text-xl text-on-surface">Live Zone Status</h1>
    </div>
    <div class="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded-full"><div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div><span class="text-[10px] font-bold text-primary uppercase">Live</span></div>
  </header>

  <main class="px-4 pt-6 space-y-6">
    <div class="p-5 rounded-2xl ${risk ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed/35 text-on-surface'}">
      <p class="font-bold text-lg">${risk ? 'Active: Heavy Rainfall Risk' : 'Zone Stable'}</p>
      <p class="text-sm">${risk ? 'Exercise caution in low-lying routes.' : 'No immediate disruption risk detected.'}</p>
    </div>

    <div class="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-outline-variant/10">
      <p class="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Zone ${state.user.zone || 'Zone 4'}</p>
      <h2 class="font-headline font-black text-2xl">${state.user.city || 'South Chennai'}</h2>
      <p class="text-tertiary font-semibold mt-1">Scanning real-time precipitation</p>
    </div>

    <div class="bg-surface-container-low rounded-3xl p-5">
      <div class="grid grid-cols-2 gap-4">
        <div><p class="eyebrow">Rain</p><p class="text-3xl font-black">${data.rain_mm}mm</p></div>
        <div><p class="eyebrow">AQI</p><p class="text-3xl font-black">${data.aqi}</p></div>
        <div><p class="eyebrow">Temp</p><p class="text-3xl font-black">${data.temp_c}°C</p></div>
        <div><p class="eyebrow">Visibility</p><p class="text-3xl font-black">${data.visibility_km}km</p></div>
      </div>
      <p class="text-on-surface-variant font-semibold mt-4"><span class="material-symbols-outlined text-base align-middle text-primary">air</span> NE ${data.wind_kmh || 14} km/h</p>
    </div>

    <div class="bg-surface-container-low rounded-3xl p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-headline font-bold text-xl">6-Hour Forecast</h3>
        <span class="eyebrow">Breach Probability</span>
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${(state.riskForecast || [{ time: 'Now', probability: 90, icon: 'rainy' }, { time: '+1 hr', probability: 65, icon: 'rainy_light' }, { time: '+2 hr', probability: 40, icon: 'cloud' }]).slice(0, 3).map((f, i) => `
          <div class="rounded-2xl p-3 text-center ${i === 0 ? 'bg-primary text-white' : 'bg-surface-container-lowest'}">
            <p class="text-xs font-bold">${f.time}</p>
            <span class="material-symbols-outlined mt-2 ${i === 0 ? 'text-white' : 'text-primary'}">${f.icon || 'partly_cloudy_day'}</span>
            <p class="text-2xl font-black mt-1">${f.probability}%</p>
          </div>
        `).join('')}
      </div>
    </div>
  </main>
</div>`;
}

export function payoutsScreen(state) {
  const history = state.payoutHistory || [];
  const total = state.payoutTotal || { total: 0, count: 0, this_month: 0, this_month_count: 0 };

  const resolvedStatus = (status) => {
    const key = String(status || '').toLowerCase();
    if (key.includes('credit')) return { bg: 'bg-tertiary-fixed/30', text: 'text-tertiary', icon: 'check_circle', label: 'Credited' };
    if (key.includes('process') || key.includes('pending')) return { bg: 'bg-secondary-fixed-dim/20', text: 'text-secondary', icon: 'pending_actions', label: 'Processing' };
    if (key.includes('review') || key.includes('hold') || key.includes('held')) return { bg: 'bg-surface-container-high', text: 'text-on-surface-variant', icon: 'policy', label: 'Review' };
    if (key.includes('fail')) return { bg: 'bg-error-container', text: 'text-error', icon: 'cancel', label: 'Failed' };
    return { bg: 'bg-tertiary-fixed/30', text: 'text-tertiary', icon: 'check_circle', label: 'Credited' };
  };

  const triggerIcon = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('rain')) return 'rainy';
    if (t.includes('aqi') || t.includes('air')) return 'air';
    if (t.includes('heat')) return 'thermostat';
    if (t.includes('fog')) return 'foggy';
    if (t.includes('traffic') || t.includes('gridlock')) return 'traffic';
    if (t.includes('bandh') || t.includes('curfew')) return 'lock_clock';
    if (t.includes('platform') || t.includes('outage')) return 'cloud_off';
    if (t.includes('alert')) return 'notifications_active';
    return 'payments';
  };

  const detailPayout = history[0] || null;
  const payoutAmount = Number(detailPayout?.amount || 0);

  return `
<div class="min-h-full bg-surface flex flex-col pb-32">
  <header class="fixed top-0 w-full z-50 bg-stone-50 flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden">
        <span class="material-symbols-outlined text-white text-xl" style="font-variation-settings:'FILL' 1;">account_circle</span>
      </div>
      <h1 class="font-headline font-black tracking-tighter text-teal-900 text-lg">SecureSync AI</h1>
    </div>
    <button class="p-2 text-teal-700 hover:opacity-80 transition-opacity" aria-label="Notifications">
      <span class="material-symbols-outlined">notifications</span>
    </button>
  </header>

  <main class="pt-24 pb-8 px-4 max-w-[390px] mx-auto min-h-screen space-y-6">
    <!-- Section Title -->
    <div class="mb-2 px-2">
      <h2 class="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Your Payouts</h2>
    </div>

    <!-- Summary Bento Grid -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-surface-container-lowest p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-32">
        <p class="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Total Lifetime</p>
        <div class="mt-auto">
          <span class="rupee-symbol text-primary text-xl">₹</span>
          <span class="font-noto font-bold text-2xl text-on-surface">${Number(total.total || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
      <div class="bg-primary-container p-5 rounded-xl shadow-[0_8px_24px_rgba(0,94,82,0.12)] flex flex-col justify-between h-32 relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
        <p class="text-on-primary-container text-xs font-semibold uppercase tracking-wider">This Month</p>
        <div class="mt-auto">
          <span class="rupee-symbol text-white text-xl">₹</span>
          <span class="font-noto font-bold text-2xl text-white">${Number(total.this_month || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <!-- Filter Chips -->
    <div class="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
      <button class="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-semibold whitespace-nowrap">All</button>
      <button class="px-5 py-2.5 bg-surface-container-low text-on-surface-variant rounded-full text-sm font-semibold whitespace-nowrap hover:bg-surface-container-high transition-colors">This Month</button>
      <button class="px-5 py-2.5 bg-surface-container-low text-on-surface-variant rounded-full text-sm font-semibold whitespace-nowrap hover:bg-surface-container-high transition-colors">Last Month</button>
    </div>

    <!-- Payout List -->
    <div class="space-y-3">
      ${history.length === 0 ? `
        <div class="mt-8 text-center px-8">
          <div class="w-full aspect-square mb-6 rounded-3xl bg-gradient-to-br from-surface-container-low to-surface-container-high flex items-center justify-center overflow-hidden">
            <span class="material-symbols-outlined text-[80px] text-outline-variant opacity-30">partly_cloudy_day</span>
          </div>
          <p class="text-on-surface font-headline font-bold text-lg mb-2">No payouts yet</p>
          <p class="text-on-surface-variant text-sm leading-relaxed">But your coverage is watching every mile. Keep moving!</p>
        </div>` : history.slice(0, 6).map((p) => {
          const s = resolvedStatus(p.status);
          const amount = Number(p.amount || 0);
          const dateStr = p.date || p.status_updated_at || 'Recent';
          const typeStr = p.type || 'Payout Event';
          return `
          <button type="button" onclick="actions.goToPayoutCelebration()" class="w-full text-left bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between group active:scale-[0.98] transition-transform border-0 shadow-sm">
            <div class="flex items-center gap-4 min-w-0">
              <div class="w-12 h-12 rounded-full ${s.bg} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined ${s.text}">${triggerIcon(typeStr)}</span>
              </div>
              <div class="min-w-0">
                <p class="font-noto font-bold text-on-surface truncate">${typeStr}</p>
                <p class="text-on-surface-variant text-[11px] font-medium truncate">${dateStr}</p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="flex items-center justify-end gap-1 mb-1">
                <span class="rupee-symbol text-on-surface text-sm">₹</span>
                <span class="font-noto font-bold text-lg text-on-surface">${amount.toLocaleString('en-IN')}</span>
              </div>
              <span class="px-2.5 py-0.5 ${s.bg} ${s.text} text-[10px] font-bold rounded-full uppercase tracking-tighter">${s.label}</span>
            </div>
          </button>`;
        }).join('')}
    </div>

    <!-- Payout Details (expanded for latest) -->
    <section class="mt-8 bg-surface-container-low rounded-2xl p-6 border-2 border-dashed border-outline-variant/30">
      <div class="flex items-center justify-between mb-6">
        <h3 class="font-headline font-bold text-on-surface">${t('payout_details')}</h3>
        <span class="material-symbols-outlined text-on-surface-variant">keyboard_arrow_down</span>
      </div>
      <div class="space-y-4">
        <div class="flex justify-between items-center pb-3 border-b border-outline-variant/10">
          <span class="text-on-surface-variant text-sm">${t('trigger')}</span>
          <span class="text-on-surface font-semibold text-sm">${detailPayout?.type || t('shift_completion') || 'Shift Completion'}</span>
        </div>
        <div class="flex justify-between items-center pb-3 border-b border-outline-variant/10">
          <span class="text-on-surface-variant text-sm">${t('calculation')}</span>
          <span class="text-on-surface font-semibold text-sm">${formatCurrency(Math.max(0, Math.round(payoutAmount / 4) || 102))} × 4 hrs = ${formatCurrency(payoutAmount || 408)}</span>
        </div>
        <div class="flex justify-between items-center pb-3 border-b border-outline-variant/10">
          <span class="text-on-surface-variant text-sm">${t('fraud_check')}</span>
          <div class="flex items-center gap-1.5 text-tertiary"><span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1;">verified</span><span class="font-bold text-sm uppercase tracking-tight">${t('passed')}</span></div>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-on-surface-variant text-sm">${t('upi_ref')}</span>
          <span class="text-on-surface font-mono text-[11px] tracking-widest bg-white px-2 py-1 rounded">${detailPayout?.upi_ref || 'TXN90283741'}</span>
        </div>
      </div>
    </section>
  </main>
</div>`;
}

export function payoutCelebrationScreen(state) {
  const payout = state.latestPayout || {};
  const amount = Number(payout.amount || 0);
  const triggerType = payout.type || 'Heavy Rain';
  const timeStr = payout.time || 'Recently';
  const dateStr = payout.date || 'Today';
  const upiRef = payout.upi_ref || 'PAY-SS8821';
  const zone = payout.zone || state.user.zone || 'Zone 4';
  const city = payout.city || state.user.city || 'South Chennai';
  const reason = payout.signal || payout.reason || `Disruption detected in ${zone}`;
  const fraudScore = payout.fraud_score || 0;
  const processingMs = payout.processing_ms || 0;
  const processSec = processingMs > 0 ? Math.round(processingMs / 1000) : 108;
  const min = Math.floor(processSec / 60);
  const sec = processSec % 60;
  const processLabel = processSec > 0 ? `${min} min ${String(sec).padStart(2, '0')} sec from trigger to credit` : 'Instant credit';

  const triggerIcon = (() => {
    const t = triggerType.toLowerCase();
    if (t.includes('rain')) return 'rainy';
    if (t.includes('aqi') || t.includes('air')) return 'air';
    if (t.includes('heat')) return 'thermostat';
    if (t.includes('fog')) return 'foggy';
    if (t.includes('traffic') || t.includes('gridlock')) return 'traffic';
    return 'rainy';
  })();

  return `
<div class="min-h-full flex flex-col relative overflow-hidden" style="background: linear-gradient(170deg, #005e52 0%, #00796b 35%, #009688 70%, #4db6ac 100%);">
  <!-- Radial glow -->
  <div class="fixed inset-0 pointer-events-none opacity-30" style="background: radial-gradient(ellipse at 50% 25%, rgba(255,255,255,0.25) 0%, transparent 65%);"></div>

  <main class="relative max-w-md w-full mx-auto z-10 flex flex-col min-h-full px-5 pt-16 pb-8">
    <!-- Back button -->
    <button onclick="actions.goToDashboard()" class="self-start mb-6 flex items-center gap-1 text-white/80 text-sm font-medium hover:text-white transition-colors">
      <span class="material-symbols-outlined text-lg">arrow_back</span>
      Dashboard
    </button>

    <!-- Main Card -->
    <div class="bg-white rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col items-center text-center mb-6">
      <!-- Icon -->
      <div class="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-lg shadow-primary/30">
        <span class="material-symbols-outlined text-white text-3xl" style="font-variation-settings:'FILL' 1;">${triggerIcon}</span>
      </div>

      <!-- Status -->
      <p class="text-xs font-black uppercase tracking-[0.25em] text-primary mb-3">${t('payout_credited')}</p>

      <!-- Amount -->
      <div class="flex items-baseline justify-center gap-1 mb-4">
        <span class="font-noto font-extrabold text-4xl leading-none tracking-tighter text-on-surface">${formatCurrency(amount)}</span>
      </div>

      <!-- Details grid -->
      <div class="w-full bg-surface-container-low rounded-2xl p-4 space-y-3 text-left">
        <div class="flex justify-between items-center py-1">
          <span class="text-on-surface-variant text-sm">${t('reason')}</span>
          <span class="text-on-surface font-semibold text-sm">${triggerType}</span>
        </div>
        <div class="border-t border-outline-variant/10"></div>
        <div class="flex justify-between items-center py-1">
          <span class="text-on-surface-variant text-sm">${t('time')}</span>
          <span class="text-on-surface font-semibold text-sm">${dateStr} · ${timeStr}</span>
        </div>
        <div class="border-t border-outline-variant/10"></div>
        <div class="flex justify-between items-center py-1">
          <span class="text-on-surface-variant text-sm">Reference</span>
          <span class="text-on-surface font-mono text-[11px] tracking-widest bg-white px-2 py-1 rounded">${upiRef}</span>
        </div>
        ${fraudScore > 0 ? `
        <div class="border-t border-outline-variant/10"></div>
        <div class="flex justify-between items-center py-1">
          <span class="text-on-surface-variant text-sm">Fraud Check</span>
          <div class="flex items-center gap-1 text-tertiary"><span class="material-symbols-outlined text-[16px]" style="font-variation-settings:'FILL' 1;">verified</span><span class="font-bold text-sm">${fraudScore < 0.3 ? 'Passed' : 'Reviewed'}</span></div>
        </div>` : ''}
      </div>
    </div>

    <!-- Processing info -->
    <div class="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-center gap-2 text-white/90 mb-6">
      <span class="material-symbols-outlined text-lg text-white/70">bolt</span>
      <span class="text-sm font-medium">${processLabel}</span>
    </div>

    <!-- Zone chip -->
    <div class="flex justify-center gap-2 mb-8">
      <span class="px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full text-white text-sm font-bold">${zone}</span>
      <span class="px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full text-white text-sm font-bold">${city}</span>
    </div>

    <!-- CTA -->
    <button onclick="actions.goToDashboard()" class="w-full bg-white text-primary py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-white/20 hover:shadow-xl transition-all active:scale-[0.98]">
      Awesome!
      <span class="material-symbols-outlined">arrow_forward</span>
    </button>
  </main>
</div>`;
}

export function accountScreen(state) {
  const user = state.user;
  const score = Math.max(0, Math.min(Number(user.score || 82), 99));
  const ringFillDeg = Math.round((score / 100) * 360);
  const shortPhone = state.phone ? `+91 ${state.phone.slice(0, 3)}XXX XX${state.phone.slice(-2)}` : '+91 98XXX XX421';
  const tierLabel = state.tier === 'premium' ? 'Premium' : 'Basic';
  const tierColor = state.tier === 'premium' ? 'text-secondary' : 'text-primary';
  const scoreLabel = score >= 90 ? t('excellent') || 'Excellent' : score >= 80 ? t('strong') || 'Strong' : score >= 70 ? t('good') || 'Good' : t('building') || 'Building';
  const platformLabel = state.platform === 'both' ? 'Swiggy + Zomato' : state.platform === 'zomato' ? 'Zomato' : 'Swiggy';
  const currentPremium = Number(state.premiumAmount || (state.tier === 'premium' ? 70 : 35));
  // Loyalty discount: 3% per continuous quarter (Policy §4.2)
  const quartersEnrolled = Math.floor((Number(state.user?.tenure_months || 0) || 0) / 3);
  const loyaltyDiscount = Math.min(15, quartersEnrolled * 3); // 3% per quarter, max 15%
  const projectedPremium = Math.max(20, Math.round(currentPremium * (1 - loyaltyDiscount / 100)));
  const progressPct = Math.max(35, Math.min(92, score));
  return `
<div class="min-h-full bg-[#f8faf9] flex flex-col pb-32">
  <header class="bg-white sticky top-0 z-50 border-b border-outline-variant/10 shadow-sm">
    <div class="px-6 py-4 w-full flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-sm border border-white/20">
          ${user.name?.charAt(0).toUpperCase() || 'P'}
        </div>
        <h1 class="font-headline font-black text-xl text-primary tracking-tighter">${t('app_name')}</h1>
      </div>
      <button class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors"><span class="material-symbols-outlined text-outline">notifications</span></button>
    </div>
  </header>
  <main class="px-5 pt-6 space-y-7 max-w-md mx-auto w-full">
    <!-- Profile Hero -->
    <section class="flex flex-col items-center text-center">
      <div class="relative mb-4">
        <div class="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary shadow-lg">
          <div class="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
             <span class="text-4xl font-headline font-black text-primary">${user.name?.charAt(0).toUpperCase() || 'P'}</span>
          </div>
        </div>
        <div class="absolute -right-1 -bottom-1 w-8 h-8 bg-tertiary-fixed-dim rounded-full border-4 border-white flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined text-white text-base">verified</span>
        </div>
      </div>
      <h2 class="text-3xl font-headline font-black text-on-surface tracking-tight">${user.name || 'Rajan Kumar'}</h2>
      <p class="text-outline font-bold text-sm tracking-wide mt-1">${shortPhone}</p>
      
      <div class="grid grid-cols-2 w-full mt-8 gap-4 px-2">
        <div class="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/10 shadow-sm">
          <p class="text-[10px] uppercase font-black text-outline tracking-widest mb-1">${t('membership')}</p>
          <p class="font-headline font-black text-lg ${tierColor}">${tierLabel}</p>
        </div>
        <div class="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/10 shadow-sm">
          <p class="text-[10px] uppercase font-black text-outline tracking-widest mb-1">${t('base_zone')}</p>
          <p class="font-headline font-black text-lg text-on-surface">${user.zone || 'Zone 4'}</p>
        </div>
      </div>
    </section>
    <!-- Verification Card -->
    <section class="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/5">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="font-headline font-extrabold text-xl mb-0.5">${t('verification_score')}</h3>
          <p class="text-xs font-bold text-outline uppercase tracking-wider">${scoreLabel} · Secure Sync</p>
        </div>
        <div class="w-16 h-16 rounded-3xl bg-primary/5 flex flex-col items-center justify-center border border-primary/10">
          <span class="text-2xl font-black text-primary">${score}</span>
          <span class="text-[8px] font-black text-primary/60 uppercase">${t('score') || 'Score'}</span>
        </div>
      </div>
      
      <div class="h-1.5 w-full bg-outline-variant/20 rounded-full overflow-hidden mb-6">
        <div class="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style="width:${score}%"></div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="text-center">
          <span class="material-symbols-outlined text-primary mb-1">speed</span>
          <p class="text-[9px] font-black text-outline uppercase mb-0.5">${t('safety')}</p>
          <p class="text-xs font-black">94%</p>
        </div>
        <div class="text-center">
          <span class="material-symbols-outlined text-primary mb-1">history</span>
          <p class="text-[9px] font-black text-outline uppercase mb-0.5">${t('continuity')}</p>
          <p class="text-xs font-black">88%</p>
        </div>
        <div class="text-center">
          <span class="material-symbols-outlined text-primary mb-1">badge</span>
          <p class="text-[9px] font-black text-outline uppercase mb-0.5">Partner ID</p>
          <p class="text-xs font-black text-tertiary">Verified</p>
        </div>
      </div>
    </section>
    
    <!-- Simulation Mode (Phase 3 Developer Tooling) -->
    <section class="bg-surface-container-low p-6 rounded-[32px] border border-dashed border-primary/30">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">science</span>
          <h3 class="font-headline font-bold text-on-surface">Developer Simulation</h3>
        </div>
        <div class="active:scale-95 transition-transform"><span class="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Active</span></div>
      </div>
      
      <div class="grid grid-cols-1 gap-3">
        <button onclick="actions.simulateSuccessPayment()" class="w-full bg-white border border-outline-variant/10 p-4 rounded-2xl flex items-center gap-3 active:bg-surface transition-colors shadow-sm">
          <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><span class="material-symbols-outlined text-green-600">credit_card</span></div>
          <div class="text-left">
            <p class="font-bold text-sm text-on-surface">Simulate Razorpay</p>
            <p class="text-[10px] text-outline font-medium uppercase">Mock Success · Policy Update</p>
          </div>
        </button>
        
        <button onclick="actions.simulateTrigger()" class="w-full bg-white border border-outline-variant/10 p-4 rounded-2xl flex items-center gap-3 active:bg-surface transition-colors shadow-sm">
          <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><span class="material-symbols-outlined text-amber-600">bolt</span></div>
          <div class="text-left">
            <p class="font-bold text-sm text-on-surface">Simulated Payout</p>
            <p class="text-[10px] text-outline font-medium uppercase">Trigger Celebration · Instant Transfer</p>
          </div>
        </button>
      </div>
      <p class="mt-4 text-[10px] text-center text-outline font-medium">Verification logic is preserved during simulation.</p>
    </section>
    
    <!-- Language Selection Section -->
    <section class="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10 shadow-sm overflow-hidden mt-6">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined">translate</span></div>
        <div>
          <p class="font-bold text-sm text-on-surface">${t('select_language')}</p>
          <p class="text-[10px] uppercase font-black text-outline tracking-wider">${t('language')}</p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        ${supportedLanguages.map(l => `
          <button onclick="actions.changeLanguage('${l.code}')" class="flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all ${state.language === l.code ? 'border-primary bg-primary/10' : 'border-outline-variant/10 bg-white'}">
            <span class="text-sm font-black mb-1 ${state.language === l.code ? 'text-primary' : 'text-on-surface'}">${l.name}</span>
            <span class="text-[9px] font-bold text-outline opacity-60 uppercase tracking-widest">${l.code}</span>
          </button>
        `).join('')}
      </div>
    </section>

    <!-- Loyalty Rewards & Savings (Integrated) -->
    <section class="bg-gradient-to-br from-[#004d40] to-[#00251a] p-1 rounded-[32px] overflow-hidden shadow-xl shadow-primary/10">
      <div class="p-6 text-white relative">
        <div class="absolute top-[-20px] right-[-20px] w-40 h-40 bg-secondary-fixed/10 rounded-full blur-3xl"></div>
        
        <div class="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h3 class="font-headline font-extrabold text-2xl tracking-tight">${t('loyalty_rewards')}</h3>
            <p class="text-white/60 text-xs font-bold mt-1">${t('status') || 'Status'}: ${score >= 90 ? t('platinum_partner') : progressPct > 80 ? t('silver_tier_unlocked') || 'Silver Tier Unlocked' : t('classic_partner') || 'Classic Partner'}</p>
          </div>
          <div class="bg-secondary text-on-secondary px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-secondary/20">
            ${loyaltyDiscount}% ${t('reward') || 'Reward'}
          </div>
        </div>

        <div class="space-y-4 relative z-10 mb-8">
           <div class="flex justify-between items-end">
             <span class="text-xs font-black uppercase tracking-widest text-white/40">Quarterly Progress</span>
             <span class="text-sm font-black">${quartersEnrolled} / 5 Quarters (3%/qtr)</span>
           </div>
           <div class="h-3 w-full bg-white/10 rounded-full p-0.5 overflow-hidden ring-1 ring-white/10">
              <div class="h-full bg-gradient-to-r from-secondary-fixed-dim to-secondary rounded-full shadow-[0_0_15px_rgba(255,193,7,0.4)]" style="width:${progressPct}%"></div>
           </div>
        </div>

        <div class="bg-white/10 backdrop-blur-md rounded-2xl p-5 flex items-center justify-between border border-white/10 shadow-inner group">
          <div>
            <p class="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Projected Next Premium</p>
            <div class="flex items-center gap-2">
              <span class="text-2xl font-black text-secondary-fixed-dim"><span class="rupee-symbol">₹</span>${projectedPremium}</span>
              <span class="text-sm text-white/30 line-through"><span class="rupee-symbol">₹</span>${currentPremium}</span>
            </div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-secondary-fixed-dim group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-3xl">trending_down</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Policy Document Section -->
    <section class="bg-surface-container-lowest rounded-[32px] border border-outline-variant/10 shadow-sm overflow-hidden">
      <button onclick="document.getElementById('policy-section-body').classList.toggle('hidden'); this.querySelector('.toggle-icon').classList.toggle('rotate-180');" class="w-full p-6 flex items-center justify-between text-left">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined">description</span></div>
          <div>
            <p class="font-bold text-sm text-on-surface">${t('policy_document')}</p>
            <p class="text-[10px] uppercase font-black text-outline tracking-wider">${t('policy_desc') || 'Coverage Plans · Triggers · Payouts'}</p>
          </div>
        </div>
        <span class="material-symbols-outlined text-outline toggle-icon transition-transform">expand_more</span>
      </button>
      <div id="policy-section-body" class="hidden px-6 pb-6">
        <!-- Plans Comparison §2.1 -->
        <div class="bg-surface-container-low rounded-2xl p-5 mb-4">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface">Weekly Plans (§2.1)</h4>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="rounded-2xl border-2 ${state.tier === 'premium' ? 'border-outline-variant/10' : 'border-primary'} p-4 text-center">
              <p class="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Basic</p>
              <p class="font-headline font-bold text-lg">₹20 – ₹35<span class="text-xs text-outline font-normal">/wk</span></p>
              <div class="text-left mt-3 space-y-1.5 text-xs">
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Heavy Rain</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Dense Fog</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Gridlock</p>
                <p class="flex items-center gap-1.5 text-outline/40"><span class="material-symbols-outlined text-sm">cancel</span> Heat Wave</p>
                <p class="flex items-center gap-1.5 text-outline/40"><span class="material-symbols-outlined text-sm">cancel</span> Severe AQI</p>
                <p class="flex items-center gap-1.5 text-outline/40"><span class="material-symbols-outlined text-sm">cancel</span> Bandh / Curfew</p>
                <p class="flex items-center gap-1.5 text-outline/40"><span class="material-symbols-outlined text-sm">cancel</span> Platform Outage</p>
              </div>
              <p class="mt-3 text-[10px] font-bold text-outline">Max weekly: ₹816</p>
            </div>
            <div class="rounded-2xl border-2 ${state.tier === 'premium' ? 'border-secondary' : 'border-outline-variant/10'} p-4 text-center relative overflow-hidden">
              <div class="absolute top-0 right-0 bg-secondary text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-bl-lg tracking-wider">Full</div>
              <p class="text-[10px] font-black uppercase tracking-widest text-secondary mb-1">Premium</p>
              <p class="font-headline font-bold text-lg">₹40 – ₹70<span class="text-xs text-outline font-normal">/wk</span></p>
              <div class="text-left mt-3 space-y-1.5 text-xs">
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Heavy Rain</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Dense Fog</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-sm">check_circle</span> Gridlock</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-secondary text-sm">check_circle</span> Heat Wave</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-secondary text-sm">check_circle</span> Severe AQI</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-secondary text-sm">check_circle</span> Bandh / Curfew</p>
                <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-secondary text-sm">check_circle</span> Platform Outage</p>
              </div>
              <p class="mt-3 text-[10px] font-bold text-outline">Max weekly: ₹4,080</p>
            </div>
          </div>
          <div class="bg-primary/5 rounded-xl p-3 text-xs text-on-surface-variant">
            <span class="font-bold text-primary">Loyalty:</span> 3% discount per continuous quarter of enrollment.
          </div>
        </div>

        <!-- Payout Formula §3 -->
        <div class="bg-surface-container-low rounded-2xl p-5 mb-4">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface">Payout Formula (§3)</h4>
          <div class="bg-primary/5 rounded-xl p-4 mb-3 text-center">
            <p class="font-mono font-bold text-primary text-lg">Payout = ₹102 × Disruption Hours</p>
            <p class="text-xs text-outline mt-1">Rate based on Zomato CEO disclosure, Jan 2026</p>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Heavy Rain (≥64.5mm)</span><span class="font-bold">₹408 (4 hrs)</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Very Heavy Rain (≥124.5mm)</span><span class="font-bold">₹612 (6 hrs)</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Extremely Heavy / Red Alert</span><span class="font-bold">₹816 (8 hrs)</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Dense Fog (<200m)</span><span class="font-bold">₹408 (4 hrs)</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Heat Wave (≥40°C)</span><span class="font-bold">₹408 (4 hrs)</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Gridlock (≤8 km/h)</span><span class="font-bold">₹306 (3 hrs)</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Severe AQI (301–400)</span><span class="font-bold">₹510 (5 hrs)</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">AQI Severe (401–500)</span><span class="font-bold">₹612 (6 hrs)</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Bandh / Curfew</span><span class="font-bold">₹816 (8 hrs)</span></div>
            <div class="flex justify-between py-1.5"><span class="text-outline">Platform Outage</span><span class="font-bold">₹102 × confirmed hrs</span></div>
          </div>
        </div>

        <!-- Premium Formula §4 -->
        <div class="bg-surface-container-low rounded-2xl p-5 mb-4">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface">Premium Calculation (§4)</h4>
          <div class="bg-secondary/5 rounded-xl p-4 mb-3 text-center">
            <p class="font-mono font-bold text-secondary text-sm">prob × loss × 7 × load factor</p>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Historical Probe</span><span class="font-bold">10-years</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Ward Factor</span><span class="font-bold">Actual Probability</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Severity</span><span class="font-bold">Avg Hours Lost</span></div>
            <div class="flex justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Load Factor</span><span class="font-bold">1.54</span></div>
            <div class="flex justify-between py-1.5"><span class="text-outline">Target BCR</span><span class="font-bold text-primary">65%</span></div>
          </div>
        </div>

        <!-- Fraud Detection §6 -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface">Fraud Detection (§6)</h4>
          <div class="space-y-2 text-xs">
            <div class="flex items-center justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">Score < 0.30</span><span class="font-bold text-primary">AUTO-PAY ⚡</span></div>
            <div class="flex items-center justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">0.30–0.65 + Network Weak</span><span class="font-bold text-tertiary">GRACE-PAY</span></div>
            <div class="flex items-center justify-between py-1.5 border-b border-outline-variant/10"><span class="text-outline">0.30–0.65 + Ward Mismatch</span><span class="font-bold text-secondary">SOFT-HOLD</span></div>
            <div class="flex items-center justify-between py-1.5"><span class="text-outline">Score > 0.65</span><span class="font-bold text-error">HARD-HOLD</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- AI Support Chat (Phase 3 Premium Support) -->
    <section class="bg-surface-container-lowest rounded-[32px] border border-outline-variant/10 shadow-sm overflow-hidden mb-6">
      <div class="p-6 border-b border-outline-variant/10 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined">smart_toy</span></div>
          <div>
            <p class="font-bold text-sm text-on-surface">Support AI Bhai (Beta)</p>
            <p class="text-[10px] uppercase font-black text-outline tracking-wider">Policy Advice · Payout Help</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 bg-secondary-container/20 px-2 py-1 rounded-md">
          <div class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
          <span class="text-[8px] font-black uppercase text-secondary">Active</span>
        </div>
      </div>
      
      <div id="chat-body" class="max-h-[300px] overflow-y-auto p-4 space-y-4 bg-surface-container-low/30 no-scrollbar">
        ${state.chatHistory?.length === 0 ? `
          <div class="text-center py-6 px-4">
            <div class="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
               <span class="material-symbols-outlined text-outline">help</span>
            </div>
            <p class="text-xs font-bold text-on-surface mb-1">Namaste bhai!</p>
            <p class="text-[10px] text-outline leading-relaxed">Ask me anything about your policy, payouts, or how SecureSync works. I'm here 24/7.</p>
          </div>
        ` : state.chatHistory.map(msg => `
          <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[85%] px-4 py-2.5 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm
              ${msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-white text-on-surface-variant border border-outline-variant/10 rounded-tl-none'}">
              ${msg.content}
            </div>
          </div>
        `).join('')}
        
        ${state.chatLoading ? `
          <div class="flex justify-start">
            <div class="bg-white border border-outline-variant/10 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
              <div class="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
              <div class="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        ` : ''}
      </div>
      
      <div class="p-4 bg-white border-t border-outline-variant/10">
        <div class="flex items-center gap-2 bg-surface-container-low rounded-2xl p-1.5 border border-outline-variant/10 focus-within:border-primary/30 transition-all">
          <input type="text" id="chat-input" placeholder="Type a message..." 
            class="flex-1 bg-transparent border-0 outline-none px-3 py-1.5 text-xs text-on-surface placeholder:text-outline/50"
            onkeydown="if(event.key==='Enter') actions.sendChatMessage()"/>
          <button onclick="actions.sendChatMessage()" 
            class="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all
            ${state.chatLoading ? 'opacity-50 cursor-not-allowed' : ''}" 
            ${state.chatLoading ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-base">send</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Terms of Service Section -->
    <section class="bg-surface-container-lowest rounded-[32px] border border-outline-variant/10 shadow-sm overflow-hidden">
      <button onclick="document.getElementById('tos-section-body').classList.toggle('hidden'); this.querySelector('.toggle-icon').classList.toggle('rotate-180');" class="w-full p-6 flex items-center justify-between text-left">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary"><span class="material-symbols-outlined">gavel</span></div>
          <div>
            <p class="font-bold text-sm text-on-surface">Terms of Service</p>
            <p class="text-[10px] uppercase font-black text-outline tracking-wider">Eligibility · Clauses · Privacy</p>
          </div>
        </div>
        <span class="material-symbols-outlined text-outline toggle-icon transition-transform">expand_more</span>
      </button>
      <div id="tos-section-body" class="hidden px-6 pb-6 space-y-4">
        <!-- §8.1 Eligibility -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-base">badge</span> Eligibility (§8.1)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Must be an active delivery partner on Swiggy, Zomato, or both platforms.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Minimum 7 active delivery days required before cover starts.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Workers with <5 active days in last 30 days are limited to Basic plan.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Only available within India. Payout to Indian UPI accounts only.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Must declare honest average weekly income at onboarding.</li>
          </ul>
        </div>

        <!-- §8.2 Coverage Scope -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-base">shield</span> Coverage Scope (§8.2)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Covers income loss from external disruptions only: heavy rainfall, dense fog (both plans); heat waves, severe AQI, civil disruptions, platform outages (Premium only).</li>
            <li class="flex items-start gap-2"><span class="text-error mt-0.5 text-sm">✕</span> Excluded: health, life, accident, vehicle repair, theft, personal injury, and any loss not caused by a defined parametric trigger.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Disputes resolved by reference to official data sources (IMD, CPCB, OWM). Worker testimony is not considered.</li>
          </ul>
        </div>

        <!-- §8.3 Activation & Renewal -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-base">event_available</span> Activation & Renewal (§8.3)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Activates immediately upon successful UPI payment.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Expires exactly 7 calendar days after activation at 23:59:59 IST.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Renewal is manual. New 7-day window begins from renewal payment.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Lapsed policies: 48-hour re-enrolment window retains claim history and loyalty discount.</li>
          </ul>
        </div>

        <!-- §8.4 Payout Conditions -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-base">payments</span> Payout Conditions (§8.4)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Payout fires when the Trigger Monitor detects a threshold crossed (confirmed by dual data sources with 10-year baselines).</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Trigger must match worker's city AND declared active hours. Off-shift triggers are not covered.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Amount is fixed by formula: ₹102/hr × Expected Disruption Hours. Cannot be negotiated.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> If UPI payout fails: 2 retries within 24 hours, then 7-day hold. After 7 days, unclaimed payout is forfeited.</li>
          </ul>
        </div>

        <!-- §8.5 Income Cap -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-base">vertical_align_top</span> Income Cap (§8.5)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Total payout in any 7-day window cannot exceed declared weekly income.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Income updated once per 30-day period with supporting evidence.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Declarations >40% above city median trigger a verification hold.</li>
          </ul>
        </div>

        <!-- §8.6 Ward Lock -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-base">lock</span> Ward Lock (§8.6)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Primary ward locked for 30 days after onboarding.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Ward changes: once per 30-day period, 7-day waiting period for new ward coverage.</li>
            <li class="flex items-start gap-2"><span class="text-error mt-0.5 text-sm">!</span> If ward BCR > 85%, new enrolments in that ward are temporarily suspended.</li>
          </ul>
        </div>

        <!-- §8.7 Fraud -->
        <div class="bg-error-container/30 rounded-2xl p-5 border border-error/10">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-error text-base">report</span> Fraud & Misrepresentation (§8.7)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-error mt-0.5 text-sm">!</span> Manipulating GPS, cell tower, device fingerprint, UPI details, or income declarations = immediate policy termination, premium forfeiture, permanent ban.</li>
            <li class="flex items-start gap-2"><span class="text-error mt-0.5 text-sm">!</span> fraud_score > 0.65 on three separate occasions within 90 days = permanent review flag.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> We use cell tower triangulation, device fingerprinting, and delivery activity cross-validation.</li>
          </ul>
        </div>

        <!-- §8.8 Liability -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-base">balance</span> Limitation of Liability (§8.8)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> SecureSync AI is a parametric income supplement — not health, life, or accident insurance.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Maximum liability per 7-day period = declared weekly income.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Not liable for Razorpay UPI network delays beyond our SLA.</li>
          </ul>
        </div>

        <!-- §8.9 Privacy -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-base">security</span> Data Privacy (§8.9)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> We collect: mobile number, city, ward, income, Partner ID, UPI ID, anonymised cell tower IDs, GPS pings.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Cell tower IDs: anonymised, used exclusively for fraud detection. Never shared.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Data is never shared with Swiggy, Zomato, or delivery platforms.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Account deletion available anytime. Active policy terminated without refund.</li>
          </ul>
        </div>

        <!-- §8.10 Governing Law -->
        <div class="bg-surface-container-low rounded-2xl p-5">
          <h4 class="font-headline font-bold text-sm mb-3 text-on-surface flex items-center gap-2"><span class="material-symbols-outlined text-primary text-base">account_balance</span> Governing Law (§8.10)</h4>
          <ul class="space-y-2 text-xs text-on-surface-variant">
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Governed by the laws of India.</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> Trigger disputes: resolved by official data source logs (stored 90 days).</li>
            <li class="flex items-start gap-2"><span class="text-primary mt-0.5 text-sm">•</span> All other disputes: arbitration under Arbitration and Conciliation Act, 1996 — Hyderabad, Telangana.</li>
          </ul>
        </div>

        <div class="text-center pt-2">
          <p class="text-[9px] text-outline">Built for Guidewire DEVTrails 2026 · In partnership with EY & NIA</p>
          <p class="text-[9px] text-outline mt-0.5">Target: DEVSummit Bangalore · May 2026</p>
        </div>
      </div>
    </section>

    <!-- Settings -->
    <section class="bg-surface-container-lowest p-2 rounded-[32px] border border-outline-variant/10 shadow-sm divide-y divide-outline-variant/5">
      <div class="p-5 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-outline"><span class="material-symbols-outlined">chat</span></div>
          <div><p class="font-bold text-sm">WhatsApp Alerts</p><p class="text-[10px] uppercase font-black text-outline tracking-wider">Policy & Trigger Info</p></div>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked class="sr-only peer"/>
          <div class="w-11 h-6 bg-outline-variant/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>



      <div class="p-4">
        <button onclick="actions.logout()" class="w-full flex items-center justify-between p-2 group text-outline hover:text-error transition-colors">
          <div class="flex items-center gap-4"><span class="material-symbols-outlined group-hover:rotate-12 transition-transform">logout</span><span class="font-black text-sm uppercase tracking-widest">${t('sign_out') || 'Sign Out'}</span></div>
          <span class="material-symbols-outlined opacity-30">chevron_right</span>
        </button>
      </div>
    </section>

    <div class="text-center space-y-1 pb-4">
      <p class="text-[10px] font-black text-outline uppercase tracking-[0.3em]">SecureSync AI Engine v3.0.0 — Phase 3 Soar</p>
      <div class="flex justify-center gap-2">
        <div class="w-1 h-1 rounded-full bg-primary/20"></div>
        <div class="w-1 h-1 rounded-full bg-primary/20"></div>
        <div class="w-1 h-1 rounded-full bg-primary/20"></div>
      </div>
    </div>
  </main>
</div>`;
}

