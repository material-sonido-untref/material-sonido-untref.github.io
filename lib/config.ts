export const APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbypEpmLEaYV2GF38sSZY2Ztw55EThgMO06MIQ3kwrq-8-aTVykz3Qiq-yrbotiKwpwP7g/exec'

/** ID de cliente de OAuth de Google Cloud; tiene que ser el mismo que CONFIG.GOOGLE_CLIENT_ID del Apps Script. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
