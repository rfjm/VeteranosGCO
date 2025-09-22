import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://nwtkpipbfmklefrawfvq.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dGtwaXBiZm1rbGVmcmF3ZnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjEwNzYsImV4cCI6MjA3NDA5NzA3Nn0.9tQ1MAui8aA_05tjVt6XeRVX8wfz_DTlYPp_ivifcHQ"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
