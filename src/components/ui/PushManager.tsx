"use client";

import { useEffect } from "react";

/* ── Enregistrement silencieux du SW ─────────────────── */

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

/* ── Abonnement push ─────────────────────────────────── */

/**
 * Demande la permission push et enregistre la subscription en base.
 * Retourne `true` si la subscription est active, `false` sinon.
 *
 * iOS : fonctionne uniquement en mode PWA (Safari 16.4+, app ajoutée à
 * l'écran d'accueil). Sur desktop (Chrome, Firefox, Edge, Safari 17+)
 * fonctionne nativement.
 */
export async function ensurePushSubscribed(): Promise<boolean> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await registerSW();
  if (!reg) return false;

  try {
    const existing = await reg.pushManager.getSubscription();
    const subscription =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      }));

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
    });

    return true;
  } catch {
    return false;
  }
}

/* ── Composant silencieux (registration au chargement) ── */

export function PushManager() {
  useEffect(() => {
    void registerSW();
  }, []);

  return null;
}
