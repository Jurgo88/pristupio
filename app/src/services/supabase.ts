import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

type SupabaseClientInstance = ReturnType<typeof createClient>

declare global {
  // eslint-disable-next-line no-var
  var __pristupioSupabase: SupabaseClientInstance | undefined
}

const createSupabaseClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
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
