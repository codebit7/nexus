import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Universal client — works in both server and client contexts.
// Wraps fetch with cache: 'no-store' to prevent Next.js production
// fetch caching from returning stale Supabase query results.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
      return fetch(url, { ...options, cache: 'no-store' });
    },
  },
});
