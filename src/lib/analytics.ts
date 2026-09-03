import { writable } from 'svelte/store';

export type AnalyticsConsent = 'granted' | 'denied' | null;

const CONSENT_KEY = 'cadence-analytics-consent';
const MEASUREMENT_ID = 'G-WBQ4ER5865';
const DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}`;

function savedConsent(): AnalyticsConsent {
  if (typeof localStorage === 'undefined') return null;
  const value = localStorage.getItem(CONSENT_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

export const analyticsConsent = writable<AnalyticsConsent>(savedConsent());

let loaded = false;

function loadGoogleAnalytics() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  (window as unknown as Record<string, boolean>)[DISABLE_KEY] = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function initAnalytics() {
  if (savedConsent() === 'granted') loadGoogleAnalytics();
}

export function setAnalyticsConsent(value: Exclude<AnalyticsConsent, null>) {
  localStorage.setItem(CONSENT_KEY, value);
  analyticsConsent.set(value);
  if (value === 'granted') loadGoogleAnalytics();
  if (value === 'denied') {
    (window as unknown as Record<string, boolean>)[DISABLE_KEY] = true;
    window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  }
}
