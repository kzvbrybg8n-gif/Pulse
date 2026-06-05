import { createClient } from "@/lib/supabase/server";
import { getAuthClaims } from "@/lib/supabase/user";
import type {
  FocusServerSettings,
  PomodoroMode,
  PomodoroSession,
} from "@/lib/types";
import { FocusView } from "./FocusView";

const SETTINGS_DEFAULTS: FocusServerSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  soundEnabled: true,
};

type SessionRow = {
  id: string;
  mode: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  task_id: string | null;
  tasks: { title: string } | null;
};

export default async function FocusPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task: initialTaskId } = await searchParams;
  const supabase = await createClient();

  const user = await getAuthClaims(supabase);

  const [{ data: sessionsRaw }, { data: focusLogRaw }, { data: tasksRaw }, { data: prefsRaw }] =
    await Promise.all([
    supabase
      .from("pomodoro_sessions")
      .select("id, mode, duration_seconds, started_at, ended_at, task_id, tasks(title)")
      .order("started_at", { ascending: false })
      .limit(20),
    // Toutes les sessions de focus (colonnes légères) pour les compteurs cumulés.
    supabase
      .from("pomodoro_sessions")
      .select("started_at, duration_seconds")
      .eq("mode", "focus"),
    supabase
      .from("tasks")
      .select("id, title")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("user_preferences")
      .select("focus_minutes, break_minutes, long_break_minutes, long_break_interval, sound_enabled")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  const p = prefsRaw as {
    focus_minutes: number;
    break_minutes: number;
    long_break_minutes: number;
    long_break_interval: number;
    sound_enabled: boolean;
  } | null;

  const serverSettings: FocusServerSettings = p
    ? {
        focusMinutes: p.focus_minutes,
        breakMinutes: p.break_minutes,
        longBreakMinutes: p.long_break_minutes,
        longBreakInterval: p.long_break_interval,
        soundEnabled: p.sound_enabled,
      }
    : SETTINGS_DEFAULTS;

  const sessions: PomodoroSession[] = ((sessionsRaw ?? []) as unknown as SessionRow[]).map(
    (r) => ({
      id: r.id,
      mode: r.mode as PomodoroMode,
      durationSeconds: r.duration_seconds,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      taskId: r.task_id,
      taskTitle: r.tasks?.title ?? null,
    }),
  );

  const focusLog = ((focusLogRaw ?? []) as { started_at: string; duration_seconds: number }[]).map(
    (r) => ({ startedAt: r.started_at, durationSeconds: r.duration_seconds }),
  );

  const openTasks = (tasksRaw ?? []) as { id: string; title: string }[];

  // Si une tâche est passée en paramètre mais qu'elle n'est plus "open"
  // (rare), on récupère quand même son titre pour la présélection.
  let preselectTaskId: string | null = initialTaskId ?? null;
  if (preselectTaskId && !openTasks.some((t) => t.id === preselectTaskId)) {
    preselectTaskId = null;
  }

  return (
    <FocusView
      initialSessions={sessions}
      initialFocusLog={focusLog}
      openTasks={openTasks}
      userId={user?.id ?? ""}
      initialTaskId={preselectTaskId}
      serverSettings={serverSettings}
    />
  );
}
