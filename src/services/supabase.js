import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// USE THE SAME SUPABASE URL AND KEY FROM YESTERDAY!
const supabaseUrl = 'https://ekgtundygvhvgessxofv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3R1bmR5Z3Zodmdlc3N4b2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTg2MjUsImV4cCI6MjA4NzMzNDYyNX0.y4XhUmWIbXJSIrxTaSLsEnYxO7VFkoLmaLY1_hM4w_g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});