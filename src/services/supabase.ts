import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://uhogosachfvjepvgqdmp.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVob2dvc2FjaGZ2amVwdmdxZG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzIxMTMsImV4cCI6MjA4OTQ0ODExM30.j6IrkM5TXnijQhy3DANBy05IzhgCacXxBbyElvv7CCU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
