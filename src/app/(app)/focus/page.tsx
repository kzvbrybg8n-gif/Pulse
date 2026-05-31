import { createClient } from "@/lib/supabase/server";
import type { PomodoroMode, PomodoroSession } from "@/lib/types";
import { FocusView } from "./FocusView";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: sessionsRaw }, { data: tasksRaw }] = await Promise.all([
    supabase
      .from("pomodoro_sessions")
      .select("id, mode, duration_seconds, started_at, ended_at, task_id, tasks(title)")
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("tasks")
      .select("id, title")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

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
      openTasks={openTasks}
      userId={user?.id ?? ""}
      initialTaskId={preselectTaskId}
    />
  );
}
