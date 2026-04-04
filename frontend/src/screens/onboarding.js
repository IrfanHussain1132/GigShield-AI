// Onboarding, Login, OTP screens
import { t, supportedLanguages, formatCurrency } from '../utils/i18n.js';

export function onboardingScreen(state) {
  return `
<div class="min-h-full bg-surface flex flex-col">
  <div class="px-6 pt-6 flex justify-end">
    <div class="bg-surface-container-lowest rounded-full flex overflow-hidden shadow-sm border border-outline-variant/20">
      ${supportedLanguages.map(l => `
        <button onclick="actions.changeLanguage('${l.code}')" class="px-3 py-2 ${state.language === l.code ? 'bg-primary text-white font-bold' : 'text-on-surface-variant font-medium'} text-[10px] uppercase tracking-tighter">
          ${l.code === 'en' ? 'EN' : l.name.toUpperCase()}
        </button>
      `).join('')}
    </div>
  </div>

  <div id="onb-slider" class="flex overflow-x-auto snap-x hide-scrollbar flex-1" style="scroll-snap-type:x mandatory;">
    <section class="min-w-full snap-center flex flex-col items-center px-6 pt-4">
      <div class="w-full rounded-[36px] overflow-hidden mb-6 relative bg-cover bg-center" style="height:420px; background-image: url('/images/onboarding.jpg');">
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        <div class="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-3xl px-7 py-4 shadow-2xl flex flex-col items-center border border-white/40 shadow-surface-container/50">
          <span class="material-symbols-outlined text-error text-2xl mb-1 drop-shadow-sm" style="font-variation-settings:'FILL' 1;">cloud_off</span>
          <div class="flex items-baseline gap-1"><span class="font-headline font-black text-5xl text-on-surface drop-shadow-sm">${formatCurrency(0)}</span></div>
          <span class="text-[10px] font-bold text-outline uppercase tracking-widest mt-1">${t('today_earnings')}</span>
        </div>
      </div>
      <h2 class="font-headline font-black text-3xl text-center text-on-surface leading-tight mb-4">${t('onboarding_title_1') || 'When the rain comes,<br/>the money should too.'}</h2>
      <p class="text-on-surface-variant text-center text-base leading-relaxed max-w-[320px]">${t('onboarding_desc_1') || 'When the clouds open up, your daily income should not dry up.'}</p>
    </section>

    <section class="min-w-full snap-center flex flex-col items-center px-6 pt-4">
      <div class="w-full rounded-[36px] overflow-hidden mb-6 relative bg-gradient-to-br from-primary-container/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-inner" style="height:420px;">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent"></div>
        <div class="text-center p-8 relative z-10 bg-white/40 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-primary/10 border border-white/60 mx-4">
          <span class="material-symbols-outlined text-primary text-7xl mb-4 drop-shadow-md" style="font-variation-settings:'FILL' 1;">shield_with_heart</span>
          <div class="flex items-baseline justify-center gap-1 mb-2"><span class="font-headline font-black text-5xl text-primary drop-shadow-sm">${formatCurrency(47)}</span></div>
          <span class="text-sm font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-lg">${t('weekly_coverage') || '/week coverage'}</span>
        </div>
      </div>
      <h2 class="font-headline font-black text-3xl text-center text-on-surface leading-tight mb-4">${t('onboarding_title_2') || '8 triggers.<br/>Zero paperwork.'}</h2>
      <p class="text-on-surface-variant text-center text-base leading-relaxed max-w-[320px]">${t('onboarding_desc_2') || 'Rain, heat, fog, AQI - we detect it for you and pay automatically.'}</p>
    </section>

    <section class="min-w-full snap-center flex flex-col items-center px-6 pt-4">
      <div class="w-full rounded-[36px] overflow-hidden mb-6 relative bg-gradient-to-br from-tertiary-fixed/40 to-tertiary/10 flex items-center justify-center border border-tertiary/10 shadow-inner" style="height:420px;">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent"></div>
        <div class="text-center p-8 relative z-10 bg-white/40 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-tertiary/10 border border-white/60 mx-4 w-[85%]">
          <div class="w-24 h-24 bg-gradient-to-tr from-tertiary to-tertiary-container rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-tertiary/30 inset-0">
            <span class="material-symbols-outlined text-white text-5xl drop-shadow-md" style="font-variation-settings:'FILL' 1;">bolt</span>
          </div>
          <p class="font-headline font-extrabold text-2xl text-tertiary-container mb-2 drop-shadow-sm">Under 2 Mins</p>
          <span class="text-[11px] font-black text-tertiary/80 uppercase tracking-widest">${t('trigger_to_upi') || 'Trigger to UPI credit'}</span>
        </div>
      </div>
      <h2 class="font-headline font-black text-3xl text-center text-on-surface leading-tight mb-4">${t('onboarding_title_3') || 'Money hits your UPI.<br/>Automatically.'}</h2>
      <p class="text-on-surface-variant text-center text-base leading-relaxed max-w-[320px]">${t('onboarding_desc_3') || 'No claims. No calls. Just protection that works.'}</p>
    </section>
  </div>

  <div class="px-6 pb-8">
    <div class="flex justify-center gap-2 mb-6">
      <div class="onb-dot h-2 rounded-full transition-all duration-300" style="width:24px;background:var(--color-primary);"></div>
      <div class="onb-dot h-2 rounded-full transition-all duration-300" style="width:8px;"></div>
      <div class="onb-dot h-2 rounded-full transition-all duration-300" style="width:8px;"></div>
    </div>
    <button onclick="actions.goToLogin()" class="btn btn-primary">
      ${t('get_started')} <span class="material-symbols-outlined">arrow_forward</span>
    </button>
    <p class="text-center mt-4 text-sm text-on-surface-variant">${t('have_account') || 'Have an account?'} <button onclick="actions.goToLogin()" class="font-bold text-primary underline">${t('sign_in')}</button></p>
  </div>
</div>`;
}

export function loginScreen(state) {
  return `
<div class="min-h-full bg-surface flex flex-col px-6 pt-12 pb-8">
  <div class="flex items-center gap-3 mb-10">
    <div class="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
      <span class="material-symbols-outlined text-white text-2xl" style="font-variation-settings:'FILL' 1;">shield</span>
    </div>
    <div>
      <h1 class="font-headline font-black text-2xl text-on-surface">${t('app_name')}</h1>
      <p class="text-on-surface-variant text-base font-medium">${t('tagline')}</p>
    </div>
  </div>

  <h2 class="font-headline font-black text-3xl text-on-surface mb-2 leading-tight">${t('welcome_back')}</h2>
  <p class="text-on-surface-variant text-base mb-10 leading-relaxed">${t('verify_identity')}</p>

  <div class="bg-surface-container-low rounded-[32px] p-6 mb-8">
    <label class="text-base font-bold text-on-surface mb-3 block" for="mobile">${t('enter_mobile')}</label>
    <div class="flex items-center bg-surface-container-high rounded-[28px] overflow-hidden">
      <span class="px-4 py-4 text-on-surface font-bold border-r border-outline-variant/20 text-xl">+91</span>
      <input id="mobile" aria-label="Mobile number" type="tel" maxlength="10" placeholder="98765 43210" class="flex-1 px-4 py-4 bg-transparent text-on-surface font-semibold text-2xl border-none outline-none focus:ring-0 placeholder:text-outline-variant" />
    </div>
    <button onclick="actions.login()" class="btn btn-primary mt-6">
      ${t('send_otp')} <span class="material-symbols-outlined">arrow_forward</span>
    </button>
  </div>

  <div class="mt-auto"></div>
</div>`;
}

export function otpScreen(state) {
  const otpInputs = [0, 1, 2, 3, 4, 5].map((i) =>
    `<input id="otp-${i}" aria-label="OTP digit ${i + 1}" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="otp-input w-12 h-16 text-center text-xl font-bold rounded-xl bg-surface-container-high border-none outline-none focus:ring-0 transition-all" oninput="actions.handleOtpInput(${i}, this.value)" onkeydown="actions.handleOtpKeydown(${i}, event)" />`
  ).join('');

  return `
<div class="min-h-full bg-surface flex flex-col px-6 pt-12 pb-8">
  <div class="flex items-center gap-3 mb-8">
    <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
      <span class="material-symbols-outlined text-white text-2xl" style="font-variation-settings:'FILL' 1;">shield</span>
    </div>
    <div>
      <h1 class="font-headline font-black text-xl text-on-surface">${t('app_name')}</h1>
      <p class="text-on-surface-variant text-sm font-medium">${t('tagline')}</p>
    </div>
  </div>

  <h2 class="font-headline font-black text-3xl text-on-surface mb-2">${t('enter_otp')}</h2>
  <p class="text-on-surface-variant text-base mb-8">${t('verify_identity')}</p>

  <div class="mb-6">
    <div class="flex items-center justify-between mb-4">
      <label class="text-base font-bold text-on-surface">${t('enter_6_digit') || 'Enter the 6-digit code'}</label>
      <span id="otp-timer" class="text-sm font-bold text-secondary-container bg-secondary-container/10 px-3 py-1 rounded-lg">01:54</span>
    </div>

    <div class="flex gap-3 justify-between mb-6">${otpInputs}</div>

    <button onclick="actions.verifyOtp()" class="btn bg-surface-container-highest text-on-surface-variant">
      <span class="material-symbols-outlined text-sm">autorenew</span> ${t('verifying_code')}
    </button>

    <p class="text-center mt-5 text-sm text-on-surface-variant">${t('did_not_receive')} <button onclick="actions.resendOtp()" class="font-bold text-primary underline">${t('resend')}</button></p>
  </div>

  <div class="mt-auto flex justify-center">
    <div class="inline-flex items-center gap-2 bg-surface-container-low px-5 py-3 rounded-full border border-outline-variant/20">
      <span class="material-symbols-outlined text-tertiary text-sm" style="font-variation-settings:'FILL' 1;">verified_user</span>
      <span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">${t('encrypted')}</span>
    </div>
  </div>

</div>`;
}
