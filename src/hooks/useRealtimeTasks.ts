import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { taskFromRow, type TaskRow } from "@/lib/tasks/fromDb";
import type { Task } from "@/lib/types";

type Handlers = {
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onInsert: (task: Task) => void;
};

/**
 * Abonnement Supabase Realtime sur la table `tasks`.
 * Synchronise l'état local de n'importe quelle vue tâches sans re-monter
 * le composant.
 *
 * Pattern handlersRef : les handlers sont des closures sur le state de la
 * vue ; ils changent à chaque rendu. On les stocke dans une ref pour que
 * l'effect (et donc la subscription) ne se ré-exécute qu'au changement
 * de supabase ou userId — pas à chaque render.
 */
export function useRealtimeTasks(
  supabase: SupabaseClient,
  userId: string,
  handlers: Handlers,
) {
  const handlersRef = useRef<Handlers>(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const channel = supabase
      .channel(`tasks:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const { eventType } = payload;

          if (eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            handlersRef.current.onDelete(id);
            return;
          }

          // INSERT ou UPDATE → re-fetch pour avoir subtasks + tags + reminders
          const id = (payload.new as { id: string }).id;
          const { data } = await supabase
            .from("tasks")
            .select(
              "id, title, status, prio, due_at, recur_rule, note, subtasks(*), task_tags(tags(name)), reminders(remind_at)",
            )
            .eq("id", id)
            .single();

          if (!data) return;
          const task = taskFromRow(data as unknown as TaskRow, new Date());

          if (eventType === "INSERT") handlersRef.current.onInsert(task);
          else handlersRef.current.onUpdate(task);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);
}
