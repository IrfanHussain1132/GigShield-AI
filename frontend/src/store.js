/**
 * Global Application State
 */
export const state = {
  screen: 'onboarding',
  language: window.localStorage.getItem('securesync_lang') || 'en',
  phone: '',
  otp: ['','','','','',''],
  phase2MockOtpEnabled: String(import.meta.env.VITE_PHASE2_MOCK_OTP || 'true').toLowerCase() === 'true',
  phase2MockOtpCode: String(import.meta.env.VITE_PHASE2_MOCK_OTP_CODE || '123456'),
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
  weather: null,
  zoneData: null,
  dashboard: null,
  payoutHistory: [],
  payoutTotal: null,
  premiumBreakdown: null,
  premiumQuotes: { key: null, basic: null, premium: null },
  latestPayout: null,
  riskForecast: null,
  forecastAlert: null,
  purchaseInFlight: false,
  chatHistory: [],
  chatLoading: false,
};

export function updateState(newState) {
  Object.assign(state, newState);
}
