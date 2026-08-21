import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseConfig(): { url: string; key: string } {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const url = typeof envUrl === 'string' && envUrl.trim() ? envUrl.trim() : 'https://placeholder.supabase.co';
  const key = typeof envKey === 'string' && envKey.trim() ? envKey.trim() : 'placeholder-anon-key';

  return { url, key };
}

export function getSupabaseUrl(): string {
  return getSupabaseConfig().url;
}

export function getSupabaseAnonKey(): string {
  return getSupabaseConfig().key;
}

let clientInstance: SupabaseClient | null = null;
let instanceUrlUsed = '';

export function getSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseConfig();

  if (!clientInstance || instanceUrlUsed !== url) {
    instanceUrlUsed = url;
    clientInstance = createClient(url, key);
  }
  return clientInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const instance = getSupabaseClient();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});



