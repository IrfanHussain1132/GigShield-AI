// Onboarding, Login, OTP screens

export function onboardingScreen(state) {
  return `
<div class="min-h-full bg-surface flex flex-col">
  <div class="px-6 pt-6 flex justify-end">
    <div class="bg-surface-container-lowest rounded-full flex overflow-hidden shadow-sm border border-outline-variant/20">
      <button class="px-4 py-2 bg-primary text-white text-xs font-bold rounded-full">EN</button>
      <button class="px-4 py-2 text-on-surface-variant text-xs font-medium font-noto">Hindi</button>
      <button class="px-4 py-2 text-on-surface-variant text-xs font-medium font-noto">Tamil</button>
    </div>
  </div>

  <div id="onb-slider" class="flex overflow-x-auto snap-x hide-scrollbar flex-1" style="scroll-snap-type:x mandatory;">
    <section class="min-w-full snap-center flex flex-col items-center px-6 pt-4">
      <div class="w-full rounded-[36px] overflow-hidden mb-6 relative" style="height:420px;">
        <img class="w-full h-full object-cover" src="/images/delivery.jpg" alt="Delivery partner on motorcycle" />
        <div class="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white rounded-3xl px-7 py-4 shadow-lg flex flex-col items-center">
          <span class="material-symbols-outlined text-error text-xl mb-1" style="font-variation-settings:'FILL' 1;">cloud_off</span>
          <div class="flex items-baseline gap-1"><span class="rupee-symbol text-2xl text-on-surface">₹</span><span class="font-headline font-black text-5xl text-on-surface">0</span></div>
          <span class="text-[10px] font-bold text-outline uppercase tracking-widest mt-1">Income Today</span>
        </div>
      </div>
      <h2 class="font-headline font-black text-3xl text-center text-on-surface leading-tight mb-4">When the rain comes,<br/>the money should too.</h2>
      <p class="text-on-surface-variant text-center text-base leading-relaxed max-w-[320px]">When the clouds open up, your daily income should not dry up.</p>
    </section>

    <section class="min-w-full snap-center flex flex-col items-center px-6 pt-4">
      <div class="w-full rounded-[36px] overflow-hidden mb-6 relative bg-primary-container/10 flex items-center justify-center" style="height:420px;">
        <div class="text-center p-8">
          <span class="material-symbols-outlined text-primary text-8xl mb-4" style="font-variation-settings:'FILL' 1;">shield_with_heart</span>
          <div class="flex items-baseline justify-center gap-1 mb-2"><span class="rupee-symbol text-3xl text-primary">₹</span><span class="font-headline font-black text-5xl text-primary">47</span></div>
          <span class="text-sm font-bold text-primary uppercase tracking-widest">/week coverage</span>
        </div>
      </div>
      <h2 class="font-headline font-black text-3xl text-center text-on-surface leading-tight mb-4">8 triggers.<br/>Zero paperwork.</h2>
      <p class="text-on-surface-variant text-center text-base leading-relaxed max-w-[320px]">Rain, heat, fog, AQI - we detect it for you and pay automatically.</p>
    </section>

    <section class="min-w-full snap-center flex flex-col items-center px-6 pt-4">
      <div class="w-full rounded-[36px] overflow-hidden mb-6 relative bg-tertiary-fixed/20 flex items-center justify-center" style="height:420px;">
        <div class="text-center p-8">
          <span class="material-symbols-outlined text-tertiary text-8xl mb-4" style="font-variation-settings:'FILL' 1;">bolt</span>
          <p class="font-headline font-extrabold text-2xl text-tertiary-container mb-2">Under 2 Minutes</p>
          <span class="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Trigger to UPI credit</span>
        </div>
      </div>
      <h2 class="font-headline font-black text-3xl text-center text-on-surface leading-tight mb-4">Money hits your UPI.<br/>Automatically.</h2>
      <p class="text-on-surface-variant text-center text-base leading-relaxed max-w-[320px]">No claims. No calls. Just protection that works.</p>
    </section>
  </div>

  <div class="px-6 pb-8">
    <div class="flex justify-center gap-2 mb-6">
      <div class="onb-dot h-2 rounded-full transition-all duration-300" style="width:24px;background:#005e52;"></div>
      <div class="onb-dot h-2 rounded-full transition-all duration-300" style="width:8px;background:#bdc9c5;"></div>
      <div class="onb-dot h-2 rounded-full transition-all duration-300" style="width:8px;background:#bdc9c5;"></div>
    </div>
    <button onclick="actions.goToLogin()" class="btn btn-primary">
      Get Started <span class="material-symbols-outlined">arrow_forward</span>
    </button>
    <p class="text-center mt-4 text-sm text-on-surface-variant">Have an account? <button onclick="actions.goToLogin()" class="font-bold text-primary underline">Sign In</button></p>
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
      <h1 class="font-headline font-black text-2xl text-on-surface">SecureSync AI</h1>
      <p class="text-on-surface-variant text-base font-medium">The Resilient Partner</p>
    </div>
  </div>

  <h2 class="font-headline font-black text-3xl text-on-surface mb-2 leading-tight">Welcome back</h2>
  <p class="text-on-surface-variant text-base mb-10 leading-relaxed">Verify your identity to access your dashboard.</p>

  <div class="bg-surface-container-low rounded-[32px] p-6 mb-8">
    <label class="text-base font-bold text-on-surface mb-3 block" for="mobile">Enter your mobile number</label>
    <div class="flex items-center bg-surface-container-high rounded-[28px] overflow-hidden">
      <span class="px-4 py-4 text-on-surface font-bold border-r border-outline-variant/20 text-xl">+91</span>
      <input id="mobile" aria-label="Mobile number" type="tel" maxlength="10" placeholder="98765 43210" class="flex-1 px-4 py-4 bg-transparent text-on-surface font-semibold text-2xl border-none outline-none focus:ring-0 placeholder:text-outline-variant" />
    </div>
    <button onclick="actions.login()" class="btn btn-primary mt-6">
      Send OTP <span class="material-symbols-outlined">arrow_forward</span>
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
      <h1 class="font-headline font-black text-xl text-on-surface">SecureSync AI</h1>
      <p class="text-on-surface-variant text-sm font-medium">The Resilient Partner</p>
    </div>
  </div>

  <h2 class="font-headline font-black text-3xl text-on-surface mb-2">Enter OTP</h2>
  <p class="text-on-surface-variant text-base mb-8">Verify your identity to access your dashboard.</p>

  <div class="mb-6">
    <div class="flex items-center justify-between mb-4">
      <label class="text-base font-bold text-on-surface">Enter the 6-digit code</label>
      <span id="otp-timer" class="text-sm font-bold text-secondary-container bg-secondary-container/10 px-3 py-1 rounded-lg">01:54</span>
    </div>

    ${state.phase2MockOtpEnabled ? `<div class="mb-3 text-xs font-semibold text-primary bg-primary/10 rounded-lg px-3 py-2">Phase 2 demo mode: enter ANY 6 digits to verify</div>` : ''}

    <div class="flex gap-3 justify-between mb-6">${otpInputs}</div>

    <button onclick="actions.verifyOtp()" class="btn bg-surface-container-highest text-on-surface-variant">
      <span class="material-symbols-outlined text-sm">autorenew</span> Verifying Code...
    </button>

    <p class="text-center mt-5 text-sm text-on-surface-variant">Did not receive code? <button onclick="actions.resendOtp()" class="font-bold text-primary underline">Resend</button></p>
  </div>

  <div class="mt-auto flex justify-center">
    <div class="inline-flex items-center gap-2 bg-surface-container-low px-5 py-3 rounded-full border border-outline-variant/20">
      <span class="material-symbols-outlined text-tertiary text-sm" style="font-variation-settings:'FILL' 1;">verified_user</span>
      <span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">End-to-end encrypted verification</span>
    </div>
  </div>

</div>`;
}
