import { NextResponse } from "next/server";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

type ReminderRow = {
  id: string;
  task_id: string;
  user_id: string;
  remind_at: string;
  tasks: { title: string } | null;
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Route appelée par Vercel Cron toutes les minutes (vercel.json).
 * Protégée par CRON_SECRET — Vercel envoie automatiquement
 * `Authorization: Bearer <CRON_SECRET>` dans les appels cron.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("id, task_id, user_id, remind_at, tasks(title)")
    .lte("remind_at", now)
    .is("sent_at", null)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!reminders || reminders.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const reminder of reminders as unknown as ReminderRow[]) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", reminder.user_id);

    if (!subs || subs.length === 0) {
      // Marquer envoyé même sans subscription (rappel consommé).
      await supabase.from("reminders").update({ sent_at: now }).eq("id", reminder.id);
      continue;
    }

    const payload = JSON.stringify({
      title: "Pulse — Rappel",
      body: reminder.tasks?.title ?? "Tâche à faire",
      url: "/today",
    });

    for (const sub of subs as unknown as SubscriptionRow[]) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        // Subscription expirée ou invalide → supprimer.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", reminder.user_id)
            .eq("endpoint", sub.endpoint);
        }
      }
    }

    await supabase.from("reminders").update({ sent_at: now }).eq("id", reminder.id);
  }

  return NextResponse.json({ sent });
}
