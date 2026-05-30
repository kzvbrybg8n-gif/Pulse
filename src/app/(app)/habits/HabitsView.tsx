"use client";

import { useState } from "react";
import { IconPlus } from "@/components/icons";
import { MobileTabs } from "@/components/layout/MobileTabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { HabitModal } from "@/components/habits/HabitModal";
import { HabitRow } from "@/components/habits/HabitRow";
import { createClient } from "@/lib/supabase/client";
import { localDateStr } from "@/lib/habits/streak";
import type { Habit } from "@/lib/types";

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
    setHabits((hs) => hs.filter((h) => h.id !== id));
    setModalTarget(null);
  }

  const checkedCount = habits.filter((h) => h.checkedToday).length;
  const total = habits.length;

  return (
    <div className="pk-app">
      <Sidebar />

      <main className="pk-content">
        <div className="pk-content-inner">
          <div className="pk-view-head">
            <div>
              <h1 className="pk-view-title">Habitudes</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {total > 0 && (
                <span className="hb-count-badge">
                  {checkedCount} / {total} aujourd&apos;hui
                </span>
              )}
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

          {habits.length === 0 ? (
            <div className="pk-empty">
              <div className="pk-empty-title">Aucune habitude</div>
              <div className="pk-empty-sub">Crée ta première habitude pour commencer à suivre tes séries.</div>
              <button
                type="button"
                className="hb-add-btn"
                style={{ marginTop: 20, width: "auto" }}
                onClick={() => setModalTarget("new")}
              >
                <IconPlus size={16} />
                Nouvelle habitude
              </button>
            </div>
          ) : (
            <div className="pk-section">
              <div className="pk-listcard hb-list">
                {habits.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    onToggle={toggleCheckin}
                    onEdit={setModalTarget}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
              <button
                type="button"
                className="hb-add-btn"
                onClick={() => setModalTarget("new")}
              >
                <IconPlus size={14} />
                Ajouter une habitude
              </button>
            </div>
          )}
        </div>
      </main>

      <MobileTabs />

      {modalTarget !== null && (
        <HabitModal
          initialHabit={modalTarget === "new" ? null : modalTarget}
          userId={userId}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}
