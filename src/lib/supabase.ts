import { createBrowserClient } from '@supabase/ssr'

// Create a singleton Supabase client for browser
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  // Only create client on client-side
  if (typeof window === 'undefined') {
    return null
  }

  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured')
    return null
  }

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// Lazy-loaded supabase client - safe for SSR/build
export const supabase = {
  auth: {
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      const client = getSupabase()
      if (!client) {
        return { data: null, error: { message: 'Supabase not configured' } }
      }
      return client.auth.signInWithPassword(credentials)
    },
    signOut: async () => {
      const client = getSupabase()
      if (!client) {
        return { error: null }
      }
      return client.auth.signOut()
    },
    getSession: async () => {
      const client = getSupabase()
      if (!client) {
        return { data: { session: null }, error: null }
      }
      return client.auth.getSession()
    },
    getUser: async () => {
      const client = getSupabase()
      if (!client) {
        return { data: { user: null }, error: null }
      }
      return client.auth.getUser()
    }
  }
}
