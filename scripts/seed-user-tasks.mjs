#!/usr/bin/env node
/* ============================================================
   Pulse — Seed des tâches « Aujourd'hui » pour TON compte.
   ============================================================
   But : peupler la base avec un jeu d'exemple pour que la vue
   « Aujourd'hui » ne soit pas vide tant que la création de
   tâches (QuickAdd) n'est pas câblée (Phase 4).

   ⚠️  Ce script PURGE toutes tes tâches puis réinsère le jeu
   d'exemple. À n'utiliser qu'en développement.

   Identifiants : passés au runtime, JAMAIS committés.
     SEED_EMAIL=toi@exemple.com SEED_PASSWORD='…' \
       node scripts/seed-user-tasks.mjs

   URL + clé publishable sont lus depuis .env.local.
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Lecture minimale de .env.local (sans dépendance) -------
function loadEnvLocal() {
  const env = {};
  try {
    const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* .env.local absent : on retombera sur process.env */
  }
  return env;
}

const fileEnv = loadEnvLocal();
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  fileEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;

if (!URL || !KEY) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY introuvables (.env.local).");
  process.exit(1);
}
if (!EMAIL || !PASSWORD) {
  console.error("✗ Fournis SEED_EMAIL et SEED_PASSWORD en variables d'environnement.");
  console.error("  Ex : SEED_EMAIL=toi@exemple.com SEED_PASSWORD='…' node scripts/seed-user-tasks.mjs");
  process.exit(1);
}

const authH = (token) => ({
  apikey: KEY,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

// --- Helpers dates (relatif à maintenant) -------------------
function at(dayOffset, h, m) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

async function main() {
  // 1. Connexion
  const signin = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const session = await signin.json();
  if (!signin.ok) {
    console.error("✗ Connexion échouée :", session.error_description || session.msg || signin.status);
    process.exit(1);
  }
  const token = session.access_token;
  const uid = session.user.id;
  const H = authH(token);
  console.log(`→ Connecté (${EMAIL}, uid ${uid.slice(0, 8)}…)`);

  // 2. Purge des tâches existantes (cascade : subtasks, task_tags)
  await fetch(`${URL}/rest/v1/tasks?user_id=eq.${uid}`, { method: "DELETE", headers: H });
  console.log("→ Tâches existantes purgées");

  // 3. Tags : get-or-create
  const tagCache = new Map();
  async function tagId(name) {
    if (tagCache.has(name)) return tagCache.get(name);
    const got = await fetch(
      `${URL}/rest/v1/tags?select=id&name=eq.${encodeURIComponent(name)}`,
      { headers: H },
    );
    const rows = await got.json();
    let id = rows[0]?.id;
    if (!id) {
      const ins = await fetch(`${URL}/rest/v1/tags`, {
        method: "POST",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify({ user_id: uid, name }),
      });
      id = (await ins.json())[0].id;
    }
    tagCache.set(name, id);
    return id;
  }

  // 4. Jeu d'exemple
  const tasks = [
    {
      title: "Finaliser la clause de non-concurrence — dossier Lemoine",
      status: "open", prio: 1, due_at: at(-1, 18, 0), note: "Vérifier la durée et le périmètre géographique.",
      tags: ["rédaction"], subtasks: [],
    },
    {
      title: "Envoyer la note de synthèse à Me Dubois",
      status: "done", prio: 3, due_at: at(0, 9, 30), note: null,
      tags: ["client"], subtasks: [],
    },
    {
      title: "Préparer le rendez-vous client TechNova",
      status: "open", prio: 2, due_at: at(0, 15, 0), note: "Points M&A à clarifier.",
      tags: ["client", "M&A"],
      subtasks: [
        { title: "Relire le pacte d'associés", done: false },
        { title: "Lister les points de vigilance", done: true },
      ],
    },
    {
      title: "Veille jurisprudentielle",
      status: "open", prio: 3, due_at: null, note: null, recur_rule: "FREQ=DAILY",
      tags: ["veille"], subtasks: [],
    },
    {
      title: "Relire le contrat de prestation",
      status: "open", prio: 2, due_at: at(0, 14, 0), note: null,
      tags: ["client"], subtasks: [],
    },
  ];

  for (const t of tasks) {
    const insTask = await fetch(`${URL}/rest/v1/tasks`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: uid,
        title: t.title,
        status: t.status,
        prio: t.prio,
        due_at: t.due_at,
        note: t.note,
        recur_rule: t.recur_rule ?? null,
      }),
    });
    if (!insTask.ok) {
      console.error("✗ Insertion tâche échouée :", await insTask.text());
      process.exit(1);
    }
    const taskRow = (await insTask.json())[0];

    // sous-tâches
    if (t.subtasks.length) {
      await fetch(`${URL}/rest/v1/subtasks`, {
        method: "POST",
        headers: H,
        body: JSON.stringify(
          t.subtasks.map((s, i) => ({
            user_id: uid, task_id: taskRow.id, title: s.title, done: s.done, order_index: i,
          })),
        ),
      });
    }

    // tags
    for (const name of t.tags) {
      const tid = await tagId(name);
      await fetch(`${URL}/rest/v1/task_tags`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({ user_id: uid, task_id: taskRow.id, tag_id: tid }),
      });
    }

    console.log(`  ✓ ${t.title}`);
  }

  console.log("\n✓ Seed terminé. Recharge l'app pour voir les tâches.");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
