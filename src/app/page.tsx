"use client";

import { useState, type ReactNode } from "react";
import { IconPlus } from "@/components/icons";
import { MobileTabs } from "@/components/layout/MobileTabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { QuickAdd } from "@/components/ui/QuickAdd";
import { TaskItem } from "@/components/ui/TaskItem";
import { OVERDUE, TODAY } from "@/lib/mocks/today";
import type { Task } from "@/lib/types";

/* ============================================================
   Vue « Aujourd'hui » — Phase 1
   Composants internes (Header, Section, MobileQuickAddSheet)
   définis ici parce qu'ils ne sont utilisés que par cette vue.
   Convention : on n'externalise que ce qui est réutilisé.
   ============================================================ */

const TODAY_DATE_LABEL = "jeudi 29 mai 2026"; // mock — Phase 4 calculera la date réelle

function Header({ count }: { count: number }) {
  return (
    <div className="pk-view-head">
      <div>
        <div className="pk-eyebrow">{TODAY_DATE_LABEL}</div>
        <h1 className="pk-view-title">Aujourd&apos;hui</h1>
      </div>
      <span className="pk-view-count">
        {count} tâches
        <br />
        restantes
      </span>
    </div>
  );
}

function Section({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="pk-section">
      <div className={"pk-section-lab" + (accent ? " accent" : "")}>{label}</div>
      <div className="pk-listcard">{children}</div>
    </div>
  );
}

function MobileQuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="pm-sheet-back" onClick={onClose} role="presentation">
      <div className="pm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="pm-sheet-grip" />
        <QuickAdd defaultValue="" />
      </div>
    </div>
  );
}

export default function TodayPage() {
  const [overdue, setOverdue] = useState<Task[]>(OVERDUE);
  const [today, setToday] = useState<Task[]>(TODAY);
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<Task[]>>) =>
    (id: number) =>
      setter((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const toggleSub = (taskId: number, subId: number) =>
    setToday((ts) =>
      ts.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subId ? { ...s, done: !s.done } : s,
              ),
            }
          : t,
      ),
    );

  const remaining =
    overdue.filter((t) => !t.done).length + today.filter((t) => !t.done).length;

  return (
    <div className="pk-app">
      <Sidebar />

      <main className="pk-content">
        <div className="pk-content-inner">
          <Header count={remaining} />

          <div className="pk-qa-wrap">
            <QuickAdd defaultValue="Relire le mémo demain 14h !urgent #client" />
          </div>

          <Section label="En retard" accent>
            {overdue.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={toggle(setOverdue)}
                onToggleSub={toggleSub}
              />
            ))}
          </Section>

          <Section label="Aujourd'hui">
            {today.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={toggle(setToday)}
                onToggleSub={toggleSub}
                hoverDemo={t.id === 5}
              />
            ))}
          </Section>
        </div>
      </main>

      <button
        type="button"
        className="pm-fab"
        onClick={() => setSheetOpen(true)}
        aria-label="Ajouter une tâche"
      >
        <IconPlus size={26} />
      </button>

      <MobileTabs />

      <MobileQuickAddSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
