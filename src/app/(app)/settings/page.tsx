import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "./SettingsView";

export const metadata = { title: "Réglages — Pulse" };

type UserPrefsRow = {
  reminder_default_minutes: number | null;
  tasks_sort_order: string;
  tasks_show_completed: boolean;
  focus_minutes: number;
  break_minutes: number;
  long_break_minutes: number;
  long_break_interval: number;
  sound_enabled: boolean;
  notifications_enabled: boolean;
  reminders_enabled: boolean;
};

const PREF_DEFAULTS: UserPrefsRow = {
  reminder_default_minutes: null,
  tasks_sort_order: "created",
  tasks_show_completed: true,
  focus_minutes: 25,
  break_minutes: 5,
  long_break_minutes: 15,
  long_break_interval: 4,
  sound_enabled: true,
  notifications_enabled: false,
  reminders_enabled: true,
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("user_preferences")
    .select(
      "reminder_default_minutes, tasks_sort_order, tasks_show_completed, focus_minutes, break_minutes, long_break_minutes, long_break_interval, sound_enabled, notifications_enabled, reminders_enabled",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const prefs: UserPrefsRow = row ? { ...PREF_DEFAULTS, ...row } : PREF_DEFAULTS;

  return (
    <SettingsView
      email={user.email ?? ""}
      userId={user.id}
      initialPrefs={prefs}
    />
  );
}
