"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLogOut, IconX } from "@/components/icons";
import { MobileTabs } from "@/components/layout/MobileTabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { saveSettings } from "@/lib/pomodoro/settings";

/* ── Types ─────────────────────────────────────────────── */

export type UserPrefs = {
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

type Props = {
  email: string;
  userId: string;
  initialPrefs: UserPrefs;
};

type NotifPermission = "default" | "granted" | "denied" | "unsupported";

/* ── Helpers ────────────────────────────────────────────── */

function Toggle({
  id,
  checked,
  onChange,
  disabled = false,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="sg-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="sg-toggle-track" />
    </label>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ── Composant principal ────────────────────────────────── */

export function SettingsView({ email, userId, initialPrefs }: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  /* ── State préférences ─── */
  const [prefs, setPrefs] = useState<UserPrefs>(initialPrefs);

  /* ── Formulaires locaux (valeurs en cours d'édition) ─── */
  const [tasksDraft, setTasksDraft] = useState({
    reminder_default_minutes: initialPrefs.reminder_default_minutes,
    tasks_sort_order: initialPrefs.tasks_sort_order,
    tasks_show_completed: initialPrefs.tasks_show_completed,
  });
  const [pomoDraft, setPomoDraft] = useState({
    focus_minutes: initialPrefs.focus_minutes,
    break_minutes: initialPrefs.break_minutes,
    long_break_minutes: initialPrefs.long_break_minutes,
    long_break_interval: initialPrefs.long_break_interval,
    sound_enabled: initialPrefs.sound_enabled,
  });

  /* ── UI state ─── */
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notifPerm, setNotifPerm] = useState<NotifPermission>("unsupported");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingTasks, setSavingTasks] = useState(false);
  const [savingPomo, setSavingPomo] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* ── Init côté client ─── */
  useEffect(() => {
    // Thème
    const stored = localStorage.getItem("pulse:theme") as "light" | "dark" | null;
    const initial = stored ?? "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial === "dark" ? "dark" : "");

    // Permission notifications
    if (typeof Notification === "undefined") {
      setNotifPerm("unsupported");
    } else {
      setNotifPerm(Notification.permission as NotifPermission);
    }
  }, []);

  /* ── Persistance thème ─── */
  function handleThemeToggle(dark: boolean) {
    const next = dark ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("pulse:theme", next);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "");
  }

  /* ── Upsert générique dans user_preferences ─── */
  async function upsertPrefs(patch: Partial<UserPrefs>) {
    const { error } = await supabase.from("user_preferences").upsert(
      { user_id: userId, ...patch },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  }

  /* ── Toggle auto-save (notifications, reminders) ─── */
  async function handleToggle(field: keyof UserPrefs, value: boolean) {
    setPrefs((p) => ({ ...p, [field]: value }));
    setSaveError(null);
    try {
      await upsertPrefs({ [field]: value });
    } catch {
      setPrefs((p) => ({ ...p, [field]: !value }));
      setSaveError("Erreur lors de la sauvegarde.");
    }
  }

  /* ── Enregistrer : Tâches ─── */
  async function saveTasksSection() {
    setSavingTasks(true);
    setSaveError(null);
    try {
      await upsertPrefs(tasksDraft);
      setPrefs((p) => ({ ...p, ...tasksDraft }));
    } catch {
      setSaveError("Erreur lors de la sauvegarde des réglages tâches.");
    } finally {
      setSavingTasks(false);
    }
  }

  /* ── Enregistrer : Pomodoro ─── */
  async function savePomoSection() {
    setSavingPomo(true);
    setSaveError(null);
    const validated = {
      focus_minutes: clamp(pomoDraft.focus_minutes, 5, 90),
      break_minutes: clamp(pomoDraft.break_minutes, 1, 30),
      long_break_minutes: clamp(pomoDraft.long_break_minutes, 5, 60),
      long_break_interval: clamp(pomoDraft.long_break_interval, 2, 8),
      sound_enabled: pomoDraft.sound_enabled,
    };
    setPomoDraft(validated);
    try {
      await upsertPrefs(validated);
      setPrefs((p) => ({ ...p, ...validated }));
      // Sync localStorage pour la vue Focus
      saveSettings({
        focusMinutes: validated.focus_minutes,
        breakMinutes: validated.break_minutes,
        longBreakMinutes: validated.long_break_minutes,
        longBreakInterval: validated.long_break_interval,
      });
    } catch {
      setSaveError("Erreur lors de la sauvegarde des réglages Pomodoro.");
    } finally {
      setSavingPomo(false);
    }
  }

  /* ── Demande permission notifications ─── */
  async function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm as NotifPermission);
    if (perm === "granted") {
      await handleToggle("notifications_enabled", true);
    }
  }

  /* ── Déconnexion ─── */
  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  /* ── Suppression de compte ─── */
  async function deleteAccount() {
    if (deleteInput.toLowerCase().trim() !== "supprimer") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Erreur inconnue");
      }
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      setDeleting(false);
    }
  }

  const deleteReady = deleteInput.toLowerCase().trim() === "supprimer";

  /* ── Rendu ─── */
  return (
    <div className="pk-app">
      <Sidebar />
      <main className="pk-content">
        <div className="pk-content-inner sg-wrap">
          <h1 className="sg-title">Réglages</h1>

          {saveError && <div className="sg-msg sg-msg-error" style={{ marginBottom: 16 }}>{saveError}</div>}

          {/* ── 1. Profil ── */}
          <section className="sg-card" aria-label="Profil">
            <div className="sg-card-head">
              <span className="sg-card-title">Profil</span>
            </div>
            <div className="sg-field" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
              <span className="sg-field-label">Adresse e-mail</span>
              <span className="sg-email">{email}</span>
            </div>
            <div className="sg-field">
              <div className="sg-field-info">
                <div className="sg-field-label">Session</div>
                <div className="sg-field-desc">Vous serez redirigé vers la page de connexion.</div>
              </div>
              <div className="sg-field-ctrl">
                <button type="button" className="sg-signout" onClick={signOut}>
                  <IconLogOut size={16} />
                  Se déconnecter
                </button>
              </div>
            </div>
          </section>

          {/* ── 2. Apparence ── */}
          <section className="sg-card" aria-label="Apparence">
            <div className="sg-card-head">
              <span className="sg-card-title">Apparence</span>
            </div>
            <div className="sg-field">
              <div className="sg-field-info">
                <div className="sg-field-label">Thème sombre</div>
                <div className="sg-field-desc">Inversé encre / papier — l&apos;accent vert est conservé.</div>
              </div>
              <div className="sg-field-ctrl">
                <Toggle
                  id="theme-toggle"
                  checked={theme === "dark"}
                  onChange={handleThemeToggle}
                />
              </div>
            </div>
          </section>

          {/* ── 3. Tâches ── */}
          <section className="sg-card" aria-label="Tâches">
            <div className="sg-card-head">
              <span className="sg-card-title">Tâches</span>
              <button
                type="button"
                className="sg-card-action"
                onClick={saveTasksSection}
                disabled={savingTasks}
              >
                {savingTasks ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>

            <div className="sg-field">
              <div className="sg-field-info">
                <div className="sg-field-label">Rappel par défaut</div>
                <div className="sg-field-desc">Délai avant l&apos;échéance pour les nouvelles tâches.</div>
              </div>
              <div className="sg-field-ctrl">
                <select
                  className="sg-select"
                  value={tasksDraft.reminder_default_minutes ?? "none"}
                  onChange={(e) =>
                    setTasksDraft((d) => ({
                      ...d,
                      reminder_default_minutes:
                        e.target.value === "none" ? null : Number(e.target.value),
                    }))
                  }
                >
                  <option value="none">Aucun</option>
                  <option value="5">5 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 heure</option>
                  <option value="120">2 heures</option>
                </select>
              </div>
            </div>

            <div className="sg-field">
              <div className="sg-field-info">
                <div className="sg-field-label">Ordre de tri</div>
                <div className="sg-field-desc">Ordre d&apos;affichage par défaut des tâches.</div>
              </div>
              <div className="sg-field-ctrl">
                <select
                  className="sg-select"
                  value={tasksDraft.tasks_sort_order}
                  onChange={(e) =>
                    setTasksDraft((d) => ({ ...d, tasks_sort_order: e.target.value }))
                  }
                >
                  <option value="created">Date de création</option>
                  <option value="due">Échéance</option>
                  <option value="priority">Priorité</option>
                </select>
              </div>
            </div>

            <div className="sg-field">
              <div className="sg-field-info">
                <div className="sg-field-label">Afficher les tâches complétées</div>
                <div className="sg-field-desc">Afficher ou masquer les tâches terminées dans les listes.</div>
              </div>
              <div className="sg-field-ctrl">
                <Toggle
                  id="show-completed"
                  checked={tasksDraft.tasks_show_completed}
                  onChange={(v) => setTasksDraft((d) => ({ ...d, tasks_show_completed: v }))}
                />
              </div>
            </div>
          </section>

          {/* ── 4. Pomodoro ── */}
          <section className="sg-card" aria-label="Pomodoro">
            <div className="sg-card-head">
              <span className="sg-card-title">Pomodoro</span>
              <button
                type="button"
                className="sg-card-action"
                onClick={savePomoSection}
                disabled={savingPomo}
              >
                {savingPomo ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>

            <PomoNumberField
              id="focus-minutes"
              label="Durée de focus"
              desc="Durée de chaque session de concentration."
              value={pomoDraft.focus_minutes}
              min={5}
              max={90}
              unit="min"
              onChange={(v) => setPomoDraft((d) => ({ ...d, focus_minutes: v }))}
            />
            <PomoNumberField
              id="break-minutes"
              label="Pause courte"
              desc="Durée de la pause entre deux sessions."
              value={pomoDraft.break_minutes}
              min={1}
              max={30}
              unit="min"
              onChange={(v) => setPomoDraft((d) => ({ ...d, break_minutes: v }))}
            />
            <PomoNumberField
              id="long-break-minutes"
              label="Pause longue"
              desc="Durée de la pause après le cycle complet."
              value={pomoDraft.long_break_minutes}
              min={5}
              max={60}
              unit="min"
              onChange={(v) => setPomoDraft((d) => ({ ...d, long_break_minutes: v }))}
            />
            <PomoNumberField
              id="long-break-interval"
              label="Cycles avant pause longue"
              desc="Nombre de sessions de focus avant la grande pause."
              value={pomoDraft.long_break_interval}
              min={2}
              max={8}
              unit="cycles"
              onChange={(v) => setPomoDraft((d) => ({ ...d, long_break_interval: v }))}
            />

            <div className="sg-field">
              <div className="sg-field-info">
                <div className="sg-field-label">Son de fin de session</div>
                <div className="sg-field-desc">Jouer une tonalité à la fin de chaque phase.</div>
              </div>
              <div className="sg-field-ctrl">
                <Toggle
                  id="sound-enabled"
                  checked={pomoDraft.sound_enabled}
                  onChange={(v) => setPomoDraft((d) => ({ ...d, sound_enabled: v }))}
                />
              </div>
            </div>
          </section>

          {/* ── 5. Notifications ── */}
          <section className="sg-card" aria-label="Notifications">
            <div className="sg-card-head">
              <span className="sg-card-title">Notifications</span>
            </div>

            <div className="sg-field" style={{ flexWrap: "wrap", gap: 12 }}>
              <div className="sg-field-info">
                <div className="sg-field-label">Notifications web</div>
                <div className="sg-field-desc">
                  Recevoir des notifications dans le navigateur.
                  {notifPerm === "unsupported" && " (non disponible dans ce navigateur)"}
                </div>
                {notifPerm !== "unsupported" && (
                  <NotifPermBadge
                    perm={notifPerm}
                    onRequest={requestNotifPermission}
                  />
                )}
              </div>
              <div className="sg-field-ctrl">
                <Toggle
                  id="notifications-enabled"
                  checked={prefs.notifications_enabled}
                  disabled={notifPerm !== "granted"}
                  onChange={(v) => handleToggle("notifications_enabled", v)}
                />
              </div>
            </div>

            <div className="sg-field">
              <div className="sg-field-info">
                <div className="sg-field-label">Rappels activés</div>
                <div className="sg-field-desc">Activer globalement les rappels de tâches.</div>
              </div>
              <div className="sg-field-ctrl">
                <Toggle
                  id="reminders-enabled"
                  checked={prefs.reminders_enabled}
                  onChange={(v) => handleToggle("reminders_enabled", v)}
                />
              </div>
            </div>
          </section>

          {/* ── 6. Compte ── */}
          <section className="sg-card" aria-label="Compte">
            <div className="sg-card-head">
              <span className="sg-card-title">Compte</span>
            </div>
            <div className="sg-field">
              <div className="sg-field-info">
                <div className="sg-field-label">Supprimer mon compte</div>
                <div className="sg-field-desc">
                  Supprime définitivement votre compte et toutes vos données. Cette action est irréversible.
                </div>
              </div>
              <div className="sg-field-ctrl">
                <button
                  type="button"
                  className="sg-btn sg-btn-danger"
                  onClick={() => {
                    setDeleteInput("");
                    setDeleteError(null);
                    setDeleteModalOpen(true);
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </section>
        </div>

        <MobileTabs />
      </main>

      {/* ── Modale de suppression ── */}
      {deleteModalOpen && (
        <DeleteModal
          deleteInput={deleteInput}
          onInputChange={setDeleteInput}
          deleteReady={deleteReady}
          deleting={deleting}
          error={deleteError}
          onConfirm={deleteAccount}
          onClose={() => setDeleteModalOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Sous-composants ───────────────────────────────────── */

function PomoNumberField({
  id,
  label,
  desc,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  id: string;
  label: string;
  desc: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="sg-field">
      <div className="sg-field-info">
        <div className="sg-field-label">{label}</div>
        <div className="sg-field-desc">{desc}</div>
      </div>
      <div className="sg-field-ctrl" style={{ display: "flex", alignItems: "center" }}>
        <input
          id={id}
          type="number"
          className="sg-number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n)) onChange(n);
          }}
          onBlur={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange(isNaN(n) ? min : Math.max(min, Math.min(max, n)));
          }}
        />
        <span className="sg-number-unit">{unit}</span>
      </div>
    </div>
  );
}

function NotifPermBadge({
  perm,
  onRequest,
}: {
  perm: NotifPermission;
  onRequest: () => void;
}) {
  if (perm === "granted") {
    return (
      <div className="sg-perm-row">
        <span className="sg-perm-status granted">Accordée</span>
      </div>
    );
  }
  if (perm === "denied") {
    return (
      <div className="sg-perm-row">
        <span className="sg-perm-status denied">Refusée</span>
        <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
          Modifiez les permissions dans les réglages du navigateur.
        </span>
      </div>
    );
  }
  return (
    <div className="sg-perm-row">
      <span className="sg-perm-status">Non demandée</span>
      <button type="button" className="sg-btn sg-btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={onRequest}>
        Demander la permission
      </button>
    </div>
  );
}

function DeleteModal({
  deleteInput,
  onInputChange,
  deleteReady,
  deleting,
  error,
  onConfirm,
  onClose,
}: {
  deleteInput: string;
  onInputChange: (v: string) => void;
  deleteReady: boolean;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="sg-modal-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal aria-labelledby="delete-modal-title">
      <div className="sg-modal">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 className="sg-modal-title" id="delete-modal-title">Supprimer le compte</h2>
          <button type="button" className="pk-icon-btn" onClick={onClose} aria-label="Fermer">
            <IconX size={18} />
          </button>
        </div>

        <p className="sg-modal-body">
          Cette action supprimera <strong>définitivement</strong> votre compte et l&apos;ensemble
          de vos données (tâches, habitudes, sessions Pomodoro). Elle est irréversible.
          <br /><br />
          Pour confirmer, saisissez <strong style={{ color: "var(--fg)" }}>supprimer</strong> ci&#8209;dessous.
        </p>

        <input
          ref={inputRef}
          type="text"
          className="sg-modal-input"
          placeholder="supprimer"
          value={deleteInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && deleteReady) onConfirm(); }}
          autoComplete="off"
        />

        {error && <div className="sg-msg sg-msg-error" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="sg-modal-actions">
          <button type="button" className="sg-btn sg-btn-ghost" onClick={onClose} disabled={deleting}>
            Annuler
          </button>
          <button
            type="button"
            className="sg-btn sg-btn-danger-solid"
            onClick={onConfirm}
            disabled={!deleteReady || deleting}
          >
            {deleting ? "Suppression…" : "Confirmer la suppression"}
          </button>
        </div>
      </div>
    </div>
  );
}
