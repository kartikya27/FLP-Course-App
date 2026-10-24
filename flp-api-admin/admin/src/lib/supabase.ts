import { createClient } from '@supabase/supabase-js'

// Auth only. All data goes through the FLP API.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
