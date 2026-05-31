"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import type { Countdown } from "@/lib/types";
import { CountdownCard } from "@/components/countdowns/CountdownCard";
import { CountdownModal } from "@/components/countdowns/CountdownModal";

type ModalTarget = Countdown | "new" | null;

type Props = {
  initialCountdowns: Countdown[];
  userId: string;
};

export function CountdownsView({ initialCountdowns, userId }: Props) {
  const [supabase] = useState(() => createClient());
  const [countdowns, setCountdowns] = useState<Countdown[]>(initialCountdowns);
  const [modalTarget, setModalTarget] = useState<ModalTarget>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  // Efface le message d'erreur après quelques secondes.
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  // Synchro Realtime — changements depuis un autre appareil ou onglet.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`countdowns:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "countdowns",
          filter: `user_id=eq.${userId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, router]);

  // La modale écrit en base elle-même ; ici on ne fait que refléter le résultat.
  function handleSave(countdown: Countdown) {
    setCountdowns((cs) => {
      const idx = cs.findIndex((c) => c.id === countdown.id);
      return idx >= 0
        ? cs.map((c) => (c.id === countdown.id ? countdown : c))
        : [...cs, countdown];
    });
    setModalTarget(null);
  }

  async function handleDelete(id: string) {
    const prev = countdowns;
    setCountdowns((cs) => cs.filter((c) => c.id !== id));
    setModalTarget(null);

    const { error } = await supabase.from("countdowns").delete().eq("id", id);
    if (error) {
      setCountdowns(prev);
      setErrorMsg("Échec de la suppression. Réessayez.");
    }
  }

  async function handleMove(id: string, direction: -1 | 1) {
    const index = countdowns.findIndex((c) => c.id === id);
    const target = index + direction;
    if (target < 0 || target >= countdowns.length) return;

    const prev = countdowns;
    const next = [...countdowns];
    [next[index], next[target]] = [next[target], next[index]];
    setCountdowns(next);

    // Réassigne un ordre séquentiel et persiste les lignes déplacées.
    const updates = next
      .map((c, i) => ({ c, i }))
      .filter(({ c, i }) => c.sortOrder !== i);

    const results = await Promise.all(
      updates.map(({ c, i }) =>
        supabase.from("countdowns").update({ sort_order: i }).eq("id", c.id),
      ),
    );

    if (results.some((r) => r.error)) {
      setCountdowns(prev);
      setErrorMsg("Échec de la réorganisation. Réessayez.");
    } else {
      setCountdowns(next.map((c, i) => ({ ...c, sortOrder: i })));
    }
  }

  return (
    <>
      <main className="pk-content">
        <div className="pk-content-inner">
          <div className="pk-view-head">
            <div>
              <h1 className="pk-view-title">Compte à rebours</h1>
            </div>
            <div className="hb-head-actions">
              <button
                type="button"
                className="pk-qa-go"
                onClick={() => setModalTarget("new")}
                aria-label="Nouveau compte à rebours"
              >
                <IconPlus size={16} />
                Nouveau
              </button>

              <div className="cd-menu">
                <button
                  type="button"
                  className="cd-menu-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Plus d'options"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <>
                    <button
                      type="button"
                      className="cd-menu-backdrop"
                      aria-hidden="true"
                      tabIndex={-1}
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="cd-menu-pop" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className="cd-menu-item"
                        onClick={() => {
                          setManageMode((v) => !v);
                          setMenuOpen(false);
                        }}
                      >
                        {manageMode
                          ? "Terminer la réorganisation"
                          : "Réorganiser / supprimer"}
                      </button>
                      <p className="cd-menu-hint">
                        Cliquez une carte pour la modifier.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hb-error" role="status" aria-live="polite">
            {errorMsg}
          </div>

          {countdowns.length === 0 ? (
            <div className="pk-empty">
              <div className="pk-empty-title">Aucun compte à rebours</div>
              <div className="pk-empty-sub">
                Ajoutez une date importante pour suivre le temps qui reste.
              </div>
              <button
                type="button"
                className="hb-add-btn hb-add-btn--inline"
                onClick={() => setModalTarget("new")}
              >
                <IconPlus size={16} />
                Nouveau compte à rebours
              </button>
            </div>
          ) : (
            <div className="cd-grid">
              {countdowns.map((countdown, index) => (
                <CountdownCard
                  key={countdown.id}
                  countdown={countdown}
                  manageMode={manageMode}
                  isFirst={index === 0}
                  isLast={index === countdowns.length - 1}
                  onOpen={() => setModalTarget(countdown)}
                  onMoveUp={() => handleMove(countdown.id, -1)}
                  onMoveDown={() => handleMove(countdown.id, 1)}
                  onDelete={() => handleDelete(countdown.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {modalTarget !== null && (
        <CountdownModal
          initialCountdown={modalTarget === "new" ? null : modalTarget}
          userId={userId}
          sortOrder={countdowns.length}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalTarget(null)}
        />
      )}
    </>
  );
}
