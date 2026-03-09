import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://xfaujaryofxwfcxgiqti.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmYXVqYXJ5b2Z4d2ZjeGdpcXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODYzMTAsImV4cCI6MjA3MTA2MjMxMH0.v3yek3rzmTPCBEyeJlvmuyOU_K13sJDrepcGLDJIYBc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
