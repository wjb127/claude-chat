import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Supabase가 설정되었는지 확인
export const isSupabaseConfigured =
  supabaseUrl.startsWith("https://") &&
  supabaseAnonKey !== "" &&
  supabaseAnonKey !== "your-supabase-anon-key-here";

// 설정된 경우에만 클라이언트 생성
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
