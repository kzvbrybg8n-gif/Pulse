"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@/components/icons";
import { HabitModal } from "@/components/habits/HabitModal";
import { HabitRow } from "@/components/habits/HabitRow";
import { HabitWeekStrip } from "@/components/habits/HabitWeekStrip";
import { HabitDetailPanel } from "@/components/habits/HabitDetailPanel";
import { createClient } from "@/lib/supabase/client";
import { localDateStr } from "@/lib/habits/streak";
import type { Habit } from "@/lib/types";

const TODAY_FMT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type ModalTarget = Habit | "new" | null;

function optimisticToggle(habit: Habit): Habit {
  const newChecked = !habit.checkedToday;
  const newDots = [...habit.weekDots];
  newDots[6] = newChecked;

  let newStreak = habit.streak;
  if (habit.period === "day") {
    if (newChecked) {
      // Yesterday (index 5) was checked → extend streak; otherwise start at 1
      newStreak = habit.weekDots[5] ? habit.streak + 1 : 1;
    } else {
      newStreak = Math.max(0, habit.streak - 1);
    }
  }

  return { ...habit, checkedToday: newChecked, weekDots: newDots, streak: newStreak };
}

type Props = {
  initialHabits: Habit[];
  userId: string;
};

export function HabitsView({ initialHabits, userId }: Props) {
  const [supabase] = useState(() => createClient());
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [modalTarget, setModalTarget] = useState<ModalTarget>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  // Efface automatiquement le message d'erreur après quelques secondes
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  // Synchro Realtime — changements depuis un autre appareil ou onglet
  useEffect(() => {
    const todayStr = localDateStr(new Date());
    const channel = supabase
      .channel(`habits:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits", filter: `user_id=eq.${userId}` },
        () => {
          // Création / suppression / renommage → re-fetch server
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "habit_logs", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { habit_id: string; day: string };
          if (row.day !== todayStr) return;
          // Marquer l'habitude comme cochée localement (autre appareil a coché)
          setHabits((hs) =>
            hs.map((h) =>
              h.id === row.habit_id ? { ...h, checkedToday: true, weekDots: [...h.weekDots.slice(0, 6), true] } : h,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "habit_logs", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.old as { habit_id: string; day: string };
          if (row.day !== todayStr) return;
          setHabits((hs) =>
            hs.map((h) =>
              h.id === row.habit_id ? { ...h, checkedToday: false, weekDots: [...h.weekDots.slice(0, 6), false] } : h,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, router]);

  async function toggleCheckin(id: string) {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const wasChecked = habit.checkedToday;
    const todayStr = localDateStr(new Date());

    setHabits((hs) => hs.map((h) => (h.id === id ? optimisticToggle(h) : h)));

    let err: { message: string } | null = null;

    if (!wasChecked) {
      const { error } = await supabase
        .from("habit_logs")
        .upsert(
          { user_id: userId, habit_id: id, day: todayStr },
          { onConflict: "habit_id,day" },
        );
      err = error;
    } else {
      const { error } = await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", id)
        .eq("day", todayStr);
      err = error;
    }

    if (err) {
      setHabits((hs) => hs.map((h) => (h.id === id ? habit : h)));
      setErrorMsg("Échec de l'enregistrement. Réessayez.");
    }
  }

  function handleSave(habit: Habit) {
    setHabits((hs) => {
      const idx = hs.findIndex((h) => h.id === habit.id);
      return idx >= 0
        ? hs.map((h) => (h.id === habit.id ? habit : h))
        : [...hs, habit];
    });
    setModalTarget(null);
  }

  async function handleDelete(id: string) {
    const prev = habits;
    setHabits((hs) => hs.filter((h) => h.id !== id));
    setModalTarget(null);

    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (error) {
      // Échec de la suppression → restaurer l'état précédent
      setHabits(prev);
      setErrorMsg("Échec de la suppression. Réessayez.");
    }
  }

  function handleRowDelete(id: string) {
    const habit = habits.find((h) => h.id === id);
    const name = habit ? ` « ${habit.name} »` : "";
    if (!window.confirm(`Supprimer l'habitude${name} ? Cette action est définitive.`)) return;
    void handleDelete(id);
  }

  const checkedCount = habits.filter((h) => h.checkedToday).length;
  const total = habits.length;
  const todoHabits = habits.filter((h) => !h.checkedToday);
  const doneHabits = habits.filter((h) => h.checkedToday);
  const detailHabit = detailId ? habits.find((h) => h.id === detailId) ?? null : null;

  const todayLabel = TODAY_FMT.format(new Date());

  return (
    <>
      <main className="pk-content">
        <div className="pk-content-inner">
          <div className="pk-view-head">
            <div>
              <h1 className="pk-view-title">Habitudes</h1>
              <div className="pk-view-sub hb-view-date">{todayLabel}</div>
              {total > 0 && (
                <div className="pk-view-count">
                  {checkedCount} sur {total} complétée{checkedCount > 1 ? "s" : ""} aujourd&apos;hui
                </div>
              )}
            </div>
            <div className="hb-head-actions">
              <button
                type="button"
                className="pk-qa-go"
                onClick={() => setModalTarget("new")}
                aria-label="Nouvelle habitude"
              >
                <IconPlus size={16} />
                Nouvelle
              </button>
            </div>
          </div>

          {habits.length > 0 && <HabitWeekStrip habits={habits} />}

          <div className="hb-error" role="status" aria-live="polite">
            {errorMsg}
          </div>

          {habits.length === 0 ? (
            <div className="pk-empty">
              <div className="pk-empty-title">Aucune habitude</div>
              <div className="pk-empty-sub">Crée ta première habitude pour commencer à suivre tes séries.</div>
              <button
                type="button"
                className="hb-add-btn hb-add-btn--inline"
                onClick={() => setModalTarget("new")}
              >
                <IconPlus size={16} />
                Nouvelle habitude
              </button>
            </div>
          ) : (
            <div className="pk-section">
              {todoHabits.length > 0 && (
                <>
                  <div className="pk-section-lab">À faire</div>
                  <div className="pk-listcard hb-list">
                    {todoHabits.map((habit) => (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        selected={habit.id === detailId}
                        onToggle={toggleCheckin}
                        onEdit={setModalTarget}
                        onOpen={(h) => setDetailId(h.id)}
                        onDelete={handleRowDelete}
                      />
                    ))}
                  </div>
                </>
              )}

              {doneHabits.length > 0 && (
                <>
                  <div className="pk-section-lab">Complétées aujourd&apos;hui</div>
                  <div className="pk-listcard hb-list">
                    {doneHabits.map((habit) => (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        selected={habit.id === detailId}
                        onToggle={toggleCheckin}
                        onEdit={setModalTarget}
                        onOpen={(h) => setDetailId(h.id)}
                        onDelete={handleRowDelete}
                      />
                    ))}
                  </div>
                </>
              )}

              <button
                type="button"
                className="hb-add-btn"
                onClick={() => setModalTarget("new")}
              >
                <IconPlus size={14} />
                Nouvelle habitude
              </button>
            </div>
          )}
        </div>
      </main>

      {detailHabit && modalTarget === null && (
        <HabitDetailPanel
          habit={detailHabit}
          onClose={() => setDetailId(null)}
          onEdit={setModalTarget}
        />
      )}

      {modalTarget !== null && (
        <HabitModal
          initialHabit={modalTarget === "new" ? null : modalTarget}
          userId={userId}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalTarget(null)}
        />
      )}
    </>
  );
}
