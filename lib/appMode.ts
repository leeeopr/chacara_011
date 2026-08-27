import { isSupabaseConfigured } from './supabase';

export type AppMode = 'PRODUCTION' | 'DEMO';

export function getAppMode(): AppMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('app_mode');
    if (saved === 'DEMO') return 'DEMO';
    if (saved === 'PRODUCTION') return 'PRODUCTION';
  }
  return 'PRODUCTION';
}

export function isDemoMode(): boolean {
  return getAppMode() === 'DEMO';
}

export function setAppMode(mode: AppMode) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_mode', mode);
    window.dispatchEvent(new CustomEvent('app_mode_changed', { detail: { mode } }));
  }
}

