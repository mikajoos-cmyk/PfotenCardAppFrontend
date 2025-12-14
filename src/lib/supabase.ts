import { createClient } from '@supabase/supabase-js';

// Konfiguration aus .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing in environment variables');
    // throw new Error('Supabase URL or Anon Key is missing in environment variables');
    // Preventing crash if just starting up without env, but usually should throw.
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');
