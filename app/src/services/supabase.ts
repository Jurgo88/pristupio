import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const FALLBACK_SUPABASE_URL = 'http://127.0.0.1:54321'
const FALLBACK_SUPABASE_ANON_KEY = 'missing-supabase-anon-key'

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

if (!hasSupabaseConfig) {
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Using a safe fallback client so the app can render.'
  )
}

type SupabaseClientInstance = ReturnType<typeof createClient>

declare global {
  // eslint-disable-next-line no-var
  var __pristupioSupabase: SupabaseClientInstance | undefined
}

const createSupabaseClient = () =>
  createClient(supabaseUrl || FALLBACK_SUPABASE_URL, supabaseAnonKey || FALLBACK_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })

export const supabase = globalThis.__pristupioSupabase ?? createSupabaseClient()

if (import.meta.env.DEV) {
  globalThis.__pristupioSupabase = supabase
}
