"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Identifiants invalides.");
      setLoading(false);
      return;
    }

    // Rafraîchit les Composants Serveur avec la nouvelle session, puis navigue.
    router.push("/");
    router.refresh();
  }

  return (
    <main className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Image src="/logo-light.svg" alt="Pulse" width="110" height="32" priority />
        <p className="font-serif text-lg italic text-ink-3">
          Le pouls calme de tes journées.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-lg border border-line-1 bg-paper-1 p-6 shadow-[var(--shadow-md)]"
      >
        <label className="flex flex-col gap-1.5">
          <span className="pulse-label">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-sm border border-line-2 bg-paper-0 px-3 py-2.5 text-base text-ink-1 outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="pulse-label">Mot de passe</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-sm border border-line-2 bg-paper-0 px-3 py-2.5 text-base text-ink-1 outline-none focus:border-accent"
          />
        </label>

        {error && (
          <p className="font-mono text-xs text-signal" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
