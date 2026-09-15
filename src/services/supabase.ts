import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseAnonKey?: string };

// .env (EXPO_PUBLIC_*) tem prioridade; app.json → extra serve de reserva.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '';

export const supabaseConfigured =
  SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('SEU-PROJETO') && SUPABASE_ANON_KEY.length > 20;

export const supabase = createClient(
  supabaseConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co',
  supabaseConfigured ? SUPABASE_ANON_KEY : 'placeholder-anon-key',
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

/**
 * A Araméa partilha o projeto Supabase "agendado-pt" (limite de 2 projetos
 * grátis), por isso tudo o que é dela tem o prefixo aramea_.
 */
export const TABLES = {
  orders: 'aramea_orders',
  clients: 'aramea_clients',
  products: 'aramea_products',
  completeOverdueRpc: 'aramea_complete_overdue_orders',
} as const;

export const PHOTOS_BUCKET = 'aramea-photos';
