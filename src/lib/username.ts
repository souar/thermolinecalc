import { supabase } from "@/integrations/supabase/client";

const KEY = "marquee.username";

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function clearUsername() {
  localStorage.removeItem(KEY);
}

export async function setUsername(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");
  // Upsert into users table
  const { error } = await supabase
    .from("users")
    .upsert({ username: trimmed }, { onConflict: "username" });
  if (error) throw error;
  localStorage.setItem(KEY, trimmed);
}
