// Dashboard, Coverage, Live Zone, Payouts, Celebration, and Account screens

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
    { icon: 'rainy', tone: 'text-error', label: `${weather.rain_mm}mm`, subtitle: 'Rain' },
    { icon: 'air', tone: 'text-secondary', label: `AQI ${weather.aqi}`, subtitle: 'Air' },
    { icon: 'thermostat', tone: 'text-primary', label: `${weather.temp_c}°C`, subtitle: 'Temp' },
    { icon: 'visibility', tone: 'text-on-surface-variant', label: `${weather.visibility_km}km`, subtitle: 'View' },
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
            <p class="font-headline font-bold text-[32px] leading-none mb-0.5"><span class="rupee-symbol text-[20px] opacity-90">₹</span>${activePayoutAmount.toLocaleString('en-IN')}</p>
            <h3 class="font-headline font-extrabold text-[20px] leading-tight">Heavy weather trigger in ${zone}</h3>
            <p class="text-[12px] text-white/80 mt-1">Verified by WeatherGrid · Live sync</p>
          </div>
        </div>
        <button class="px-3 py-1.5 rounded-xl border border-white/25 text-[11px] font-bold bg-white/10">Details</button>
      </div>
      <div class="mt-4 flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
        <span class="text-white/85">Payout in progress</span>
        <span class="text-secondary-fixed-dim flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim animate-pulse"></span>Transferring</span>
      </div>
      <div class="mt-2 h-2 rounded-full bg-white/15 overflow-hidden">
        <div class="h-full bg-gradient-to-r from-secondary-fixed-dim to-secondary-container rounded-full" style="width:${payoutProgress}%;"></div>
      </div>
      <div class="mt-3 flex items-center gap-2 text-[12px] text-white/90 font-semibold">
        <span class="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">verified</span>
        <span>Fraud checks passed</span>
      </div>
    </section>` : '';

  const riskTiles = hourlyForecast.slice(0, 3).map((item) => {
    const isPeak = Number(item?.probability || 0) >= 70;
    return `
      <div class="rounded-[26px] p-4 ${isPeak ? 'bg-secondary-container text-on-secondary-container shadow-[0_8px_20px_rgba(126,87,0,0.22)] ring-2 ring-secondary-fixed-dim/30' : 'bg-surface-container-low text-on-surface border border-outline-variant/10'}">
        <p class="text-sm font-bold ${isPeak ? 'text-on-secondary-container/70' : 'text-outline'}">${item.time || 'Now'}</p>
        <div class="my-2"><span class="material-symbols-outlined text-[26px] ${isPeak ? 'text-on-secondary-container' : 'text-primary'}">${item.icon || 'partly_cloudy_day'}</span></div>
        <p class="text-[32px] font-headline font-black leading-none">${item.probability || 0}<span class="text-lg">%</span></p>
      </div>`;
  }).join('');

  return `
<div class="min-h-full bg-stone-50/50 flex flex-col pb-32">
  <header class="top-shell px-6 py-4 flex justify-between items-center">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center overflow-hidden">
        <img alt="Profile" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARIoPuacA6g_vTxGE5JTqlFuF120n_Ytl_Z-uNMhcnWDv687d_xBcSYnJBey7fZtjAsM4LUrk6hmOfWW-PQ4-TsX-H9NXfhO1x4u4FdPNuV2IQVmFzxKn19ITXB8vromjQYoh3WuqP91hU5JH1KxOFCV-nykiy6d2voNJG5Ccl5BJ7gVbzzgJR_yQ4TqtWgolxabOHnb6UqfFHWC5pZb8My15rDD32L3J9O3L4UJc6fFdfKEMoR8-1fi8acT3lclkJ1Udo0LIf4mjE"/>
      </div>
      <div><h1 class="text-xs font-bold text-outline uppercase tracking-tighter">Good morning</h1><p class="font-headline font-black text-lg text-on-surface leading-tight">${name}</p></div>
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
            ${dash.has_active_policy ? 'Coverage Active' : 'Coverage Inactive'}
          </span>
          <h2 class="font-headline font-black text-3xl leading-none tracking-tight text-on-surface">${zone}</h2>
          <p class="text-on-surface-variant text-lg font-body font-semibold leading-tight mt-1">${city}</p>
        </div>
        <div class="pt-1 text-center">
          <div class="w-20 h-20 rounded-full p-[7px]" style="background:conic-gradient(#005e52 ${ringFillDeg}deg,#dce5e2 0deg)">
            <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-black text-primary">${safetyScore}</div>
          </div>
          <p class="text-[10px] font-black text-outline uppercase tracking-[0.14em] mt-2">Safety Score</p>
        </div>
      </div>
      <div class="relative z-10 mt-1 bg-surface-container-low p-3 rounded-3xl border border-outline-variant/10">
        ${weatherStrip}
      </div>
      <div class="relative z-10 mt-4 bg-surface-container-low p-4 rounded-3xl flex items-center justify-between border border-outline-variant/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white"><span class="material-symbols-outlined">shield</span></div>
          <div>
            <p class="text-[10px] font-bold text-outline uppercase leading-none mb-1">Coverage Status</p>
            <p class="text-sm font-bold text-on-surface">${dash.has_active_policy ? 'Neural Shield Active' : 'Protection Not Active'}</p>
          </div>
        </div>
        ${dash.has_active_policy ? '<span class="material-symbols-outlined text-primary" style="font-variation-settings:\'FILL\' 1;">verified</span>' : '<button onclick="actions.goToPremium()" class="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-full">Activate</button>'}
      </div>
    </section>

    ${alertCard}

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/10">
        <p class="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">This Month</p>
        <div class="flex items-baseline gap-1"><span class="rupee-symbol text-lg text-primary">₹</span><span class="text-2xl font-black text-on-surface">${Number(dash.month_total || 0).toLocaleString('en-IN')}</span></div>
        <div class="flex items-center gap-1 mt-2 text-[10px] text-tertiary font-bold"><span class="material-symbols-outlined text-xs">check_circle</span><span>${dash.has_active_policy ? 'Paid out' : 'Awaiting policy'}</span></div>
      </div>
      <div class="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/10">
        <p class="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Policy Streak</p>
        <div class="flex items-baseline gap-1"><span class="text-2xl font-black text-on-surface">${dash.policy_streak || 0}</span><span class="text-xs font-bold text-outline">weeks</span></div>
        <div class="flex items-center gap-1 mt-2 text-[10px] text-primary font-bold"><span class="material-symbols-outlined text-xs">military_tech</span><span>Shield level ${Math.min(5, Math.max(1, Math.ceil((dash.policy_streak || 0) / 2)))}</span></div>
      </div>
    </div>

    <section class="bg-gradient-to-br from-[#006457] via-[#005247] to-[#003b33] text-white rounded-[32px] p-6 relative overflow-hidden shadow-xl shadow-primary/15">
      <div class="absolute inset-0 dashboard-dot-grid opacity-25"></div>
      <div class="absolute -right-8 -bottom-10 text-white/10"><span class="material-symbols-outlined text-[180px]">payments</span></div>
      <div class="relative z-10 flex justify-between items-start mb-4">
        <div><h3 class="font-headline font-bold text-lg mb-1">Today's Earnings Estimate</h3><p class="text-white/70 text-xs">Trigger-adjusted estimate</p></div>
        <div class="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1"><div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div><span class="text-[10px] font-bold uppercase tracking-widest">Live</span></div>
      </div>
      <div class="relative z-10 flex items-baseline gap-2 mb-5"><span class="rupee-symbol text-xl opacity-80">₹</span><span class="font-headline font-black text-4xl tracking-tighter">${Number(dash.today_earnings || 0).toLocaleString('en-IN')}</span></div>
      <div class="relative z-10 flex items-center gap-3 mb-5">
        <span class="px-4 py-2 rounded-full bg-white/12 border border-white/15 text-sm font-bold">8 hrs active</span>
        <span class="px-4 py-2 rounded-full bg-white/12 border border-white/15 text-sm font-bold text-tertiary-fixed-dim">+12%</span>
      </div>
      <button onclick="actions.goToPayouts()" class="relative z-10 w-full bg-white/20 hover:bg-white/30 backdrop-blur-md py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">View Payout History <span class="material-symbols-outlined">history</span></button>
    </section>

    <section>
      <div class="flex items-center justify-between mb-3 px-1">
        <h3 class="font-headline font-black text-2xl tracking-tight text-on-surface">Risk Forecast</h3>
        <button onclick="actions.loadZoneDetails()" class="text-primary text-xs font-black uppercase tracking-wider">Next 6 hours</button>
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${riskTiles}
      </div>
    </section>
  </main>
</div>`;
}

export function coverageScreen(state) {
  const policy = state.policy;
  const status = policy ? 'ACTIVE' : 'NO POLICY';
  const triggers = [
    { label: 'Rain', icon: 'rainy', threshold: '>5mm/hr', payout: '₹408 / event', color: 'text-primary-container' },
    { label: 'AQI', icon: 'air', threshold: '>300 level', payout: '₹510 / event', color: 'text-secondary' },
    { label: 'Heat Wave', icon: 'thermostat', threshold: '>42°C peak', payout: '₹408 / event', color: 'text-amber-500' },
    { label: 'Flood', icon: 'flood', threshold: 'Water level', payout: '₹408 / event', color: 'text-blue-600' },
    { icon: 'foggy', label: 'Fog', threshold: '<50m vis.', payout: '₹408 / event', color: 'text-slate-400' },
    { label: 'Traffic', icon: 'traffic', threshold: 'Gridlock', payout: '₹306 / event', color: 'text-red-500' },
    { label: 'Curfew', icon: 'lock_clock', threshold: 'Admin lock', payout: '₹816 / event', color: 'text-on-surface' },
    { label: 'Platform', icon: 'cloud_off', threshold: 'App down', payout: '₹204 / event', color: 'text-tertiary' },
  ];

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

    <div class="flex items-center justify-between mb-4 px-1">
      <h2 class="font-headline font-black text-2xl tracking-tight text-on-surface">8-Point Protection Grid</h2>
      <span class="text-[10px] font-black uppercase text-primary bg-primary-container/10 px-2 py-1 rounded-md">Max Cap: ₹${Number(state.policy?.maxPayout || (state.tier === 'premium' ? 1200 : 800)).toLocaleString('en-IN')}</span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      ${triggers.map((t) => `
        <div class="bg-surface-container-lowest p-5 rounded-[24px] border border-outline-variant/10 shadow-sm text-center">
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
<div class="min-h-full bg-surface flex flex-col pb-32 overflow-x-hidden">
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
  <header class="fixed top-0 w-full z-50 bg-stone-50/90 backdrop-blur-md flex justify-between items-center px-6 py-4">
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
        <h3 class="font-headline font-bold text-on-surface">Payout Details</h3>
        <span class="material-symbols-outlined text-on-surface-variant">keyboard_arrow_down</span>
      </div>
      <div class="space-y-4">
        <div class="flex justify-between items-center pb-3 border-b border-outline-variant/10">
          <span class="text-on-surface-variant text-sm">Trigger</span>
          <span class="text-on-surface font-semibold text-sm">${detailPayout?.type || 'Shift Completion'}</span>
        </div>
        <div class="flex justify-between items-center pb-3 border-b border-outline-variant/10">
          <span class="text-on-surface-variant text-sm">Calculation</span>
          <span class="text-on-surface font-semibold text-sm"><span class="rupee-symbol">₹</span>${Math.max(0, Math.round(payoutAmount / 4) || 102)} × 4 hrs = <span class="rupee-symbol">₹</span>${(payoutAmount || 408).toLocaleString('en-IN')}</span>
        </div>
        <div class="flex justify-between items-center pb-3 border-b border-outline-variant/10">
          <span class="text-on-surface-variant text-sm">Fraud Check</span>
          <div class="flex items-center gap-1.5 text-tertiary"><span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' 1;">verified</span><span class="font-bold text-sm uppercase tracking-tight">Passed</span></div>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-on-surface-variant text-sm">UPI Ref</span>
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
      <p class="text-xs font-black uppercase tracking-[0.25em] text-primary mb-3">Payout Credited!</p>

      <!-- Amount -->
      <div class="flex items-baseline justify-center gap-1 mb-4">
        <span class="rupee-symbol text-2xl text-on-surface">₹</span>
        <span class="font-noto font-extrabold text-4xl leading-none tracking-tighter text-on-surface">${amount.toLocaleString('en-IN')}</span>
      </div>

      <!-- Details grid -->
      <div class="w-full bg-surface-container-low rounded-2xl p-4 space-y-3 text-left">
        <div class="flex justify-between items-center py-1">
          <span class="text-on-surface-variant text-sm">Reason</span>
          <span class="text-on-surface font-semibold text-sm">${triggerType}</span>
        </div>
        <div class="border-t border-outline-variant/10"></div>
        <div class="flex justify-between items-center py-1">
          <span class="text-on-surface-variant text-sm">Time</span>
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
  const scoreLabel = score >= 90 ? 'Excellent' : score >= 80 ? 'Strong' : score >= 70 ? 'Good' : 'Building';
  const platformLabel = state.platform === 'both' ? 'Swiggy + Zomato' : state.platform === 'zomato' ? 'Zomato' : 'Swiggy';
  const currentPremium = Number(state.premiumAmount || (state.tier === 'premium' ? 47 : 25));
  const loyaltyDiscount = score >= 90 ? 14 : score >= 80 ? 10 : 6;
  const projectedPremium = Math.max(25, Math.round(currentPremium * (1 - loyaltyDiscount / 100)));
  const progressPct = Math.max(35, Math.min(92, score));
  return `
<div class="min-h-full bg-[#f8faf9] flex flex-col pb-32">
  <header class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-outline-variant/5">
    <div class="px-6 py-4 w-full flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-primary-container/20 flex items-center justify-center overflow-hidden">
          <img alt="Delivery Partner Profile" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARIoPuacA6g_vTxGE5JTqlFuF120n_Ytl_Z-uNMhcnWDv687d_xBcSYnJBey7fZtjAsM4LUrk6hmOfWW-PQ4-TsX-H9NXfhO1x4u4FdPNuV2IQVmFzxKn19ITXB8vromjQYoh3WuqP91hU5JH1KxOFCV-nykiy6d2voNJG5Ccl5BJ7gVbzzgJR_yQ4TqtWgolxabOHnb6UqfFHWC5pZb8My15rDD32L3J9O3L4UJc6fFdfKEMoR8-1fi8acT3lclkJ1Udo0LIf4mjE"/>
        </div>
        <h1 class="font-headline font-black text-xl text-primary tracking-tighter">SecureSync AI</h1>
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
             <span class="material-symbols-outlined text-primary text-5xl" style="font-variation-settings:'FILL' 1;">account_circle</span>
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
          <p class="text-[10px] uppercase font-black text-outline tracking-widest mb-1">Membership</p>
          <p class="font-headline font-black text-lg ${tierColor}">${tierLabel}</p>
        </div>
        <div class="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/10 shadow-sm">
          <p class="text-[10px] uppercase font-black text-outline tracking-widest mb-1">Base Zone</p>
          <p class="font-headline font-black text-lg text-on-surface">${user.zone || 'Zone 4'}</p>
        </div>
      </div>
    </section>

    <!-- Verification Card -->
    <section class="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/5">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="font-headline font-extrabold text-xl mb-0.5">Verification Score</h3>
          <p class="text-xs font-bold text-outline uppercase tracking-wider">${scoreLabel} · Secure Sync</p>
        </div>
        <div class="w-16 h-16 rounded-3xl bg-primary/5 flex flex-col items-center justify-center border border-primary/10">
          <span class="text-2xl font-black text-primary">${score}</span>
          <span class="text-[8px] font-black text-primary/60 uppercase">Score</span>
        </div>
      </div>
      
      <div class="h-1.5 w-full bg-outline-variant/20 rounded-full overflow-hidden mb-6">
        <div class="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style="width:${score}%"></div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="text-center">
          <span class="material-symbols-outlined text-primary mb-1">speed</span>
          <p class="text-[9px] font-black text-outline uppercase mb-0.5">Safety</p>
          <p class="text-xs font-black">94%</p>
        </div>
        <div class="text-center">
          <span class="material-symbols-outlined text-primary mb-1">history</span>
          <p class="text-[9px] font-black text-outline uppercase mb-0.5">Continuity</p>
          <p class="text-xs font-black">88%</p>
        </div>
        <div class="text-center">
          <span class="material-symbols-outlined text-primary mb-1">verified_user</span>
          <p class="text-[9px] font-black text-outline uppercase mb-0.5">KYC</p>
          <p class="text-xs font-black text-tertiary">Active</p>
        </div>
      </div>
    </section>

    <!-- Loyalty Rewards & Savings (Integrated) -->
    <section class="bg-gradient-to-br from-[#004d40] to-[#00251a] p-1 rounded-[32px] overflow-hidden shadow-xl shadow-primary/10">
      <div class="p-6 text-white relative">
        <div class="absolute top-[-20px] right-[-20px] w-40 h-40 bg-secondary-fixed/10 rounded-full blur-3xl"></div>
        
        <div class="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h3 class="font-headline font-extrabold text-2xl tracking-tight">Loyalty Rewards</h3>
            <p class="text-white/60 text-xs font-bold mt-1">Status: ${score >= 90 ? 'Platinum Partner' : progressPct > 80 ? 'Silver Tier Unlocked' : 'Classic Partner'}</p>
          </div>
          <div class="bg-secondary text-on-secondary px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-secondary/20">
            ${loyaltyDiscount}% Reward
          </div>
        </div>

        <div class="space-y-4 relative z-10 mb-8">
           <div class="flex justify-between items-end">
             <span class="text-xs font-black uppercase tracking-widest text-white/40">Quarterly Progress</span>
             <span class="text-sm font-black">${Math.min(5, Math.max(1, Math.ceil(progressPct / 20)))} / 5 Quarters</span>
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

      <div class="p-5 space-y-5">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-outline"><span class="material-symbols-outlined">language</span></div>
          <p class="font-bold text-sm">App Language</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button class="py-3 px-4 rounded-2xl border-2 border-primary bg-primary/5 text-primary text-xs font-black">English (EN)</button>
          <button class="py-3 px-4 rounded-2xl border-2 border-outline-variant/10 bg-transparent text-outline text-xs font-bold font-noto hover:border-primary/30 transition-colors">हिंदी</button>
          <button class="py-3 px-4 rounded-2xl border-2 border-outline-variant/10 bg-transparent text-outline text-xs font-bold font-noto hover:border-primary/30 transition-colors">தமிழ்</button>
          <button class="py-3 px-4 rounded-2xl border-2 border-outline-variant/10 bg-transparent text-outline text-xs font-bold font-noto hover:border-primary/30 transition-colors">తెలుగు</button>
        </div>
      </div>

      <div class="p-4">
        <button onclick="actions.logout()" class="w-full flex items-center justify-between p-2 group text-outline hover:text-error transition-colors">
          <div class="flex items-center gap-4"><span class="material-symbols-outlined group-hover:rotate-12 transition-transform">logout</span><span class="font-black text-sm uppercase tracking-widest">Sign Out</span></div>
          <span class="material-symbols-outlined opacity-30">chevron_right</span>
        </button>
      </div>
    </section>

    <div class="text-center space-y-1 pb-4">
      <p class="text-[10px] font-black text-outline uppercase tracking-[0.3em]">SecureSync AI Engine v4.2.0</p>
      <div class="flex justify-center gap-2">
        <div class="w-1 h-1 rounded-full bg-primary/20"></div>
        <div class="w-1 h-1 rounded-full bg-primary/20"></div>
        <div class="w-1 h-1 rounded-full bg-primary/20"></div>
      </div>
    </div>
  </main>
</div>`;
}
