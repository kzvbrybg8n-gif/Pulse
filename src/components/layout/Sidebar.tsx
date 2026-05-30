"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronRight,
  IconFolder,
  IconHash,
  IconSearch,
  IconX,
} from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { FOLDERS, FOOT_NAV, SMART_LISTS } from "@/lib/mocks/today";

export function Sidebar() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FOLDERS.map((f) => [f.name, f.open])),
  );

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="pk-side">
      <div className="pk-brand">
        <Image src="/logo-light.svg" alt="Pulse" width={96} height={28} priority />
      </div>

      <div className="pk-side-search">
        <IconSearch size={16} />
        <input placeholder="Rechercher une tâche…" />
      </div>

      <div className="pk-side-lab">Listes intelligentes</div>
      <nav className="pk-nav">
        {SMART_LISTS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={"pk-navitem" + (v.active ? " active" : "")}
          >
            <v.Icon size={18} />
            <span className="t">{v.label}</span>
            <span className="c">{v.count}</span>
          </button>
        ))}
      </nav>

      <div className="pk-side-lab">Listes & projets</div>
      {FOLDERS.map((f) => (
        <div className="pk-folder" key={f.name}>
          <button
            type="button"
            className="pk-folder-head"
            onClick={() => setOpen((o) => ({ ...o, [f.name]: !o[f.name] }))}
          >
            <span className={"pk-folder-chev" + (open[f.name] ? " open" : "")}>
              <IconChevronRight size={14} />
            </span>
            <IconFolder size={16} />
            <span className="t">{f.name}</span>
          </button>
          {open[f.name] && (
            <div className="pk-folder-lists">
              {f.lists.map((l) => (
                <button key={l.name} type="button" className="pk-listitem">
                  <IconHash size={14} />
                  <span className="t">{l.name}</span>
                  <span className="c">{l.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="pk-side-foot">
        {FOOT_NAV.map((v) => (
          <button key={v.id} type="button" className="pk-footitem">
            <v.Icon size={18} />
            <span className="t">{v.label}</span>
          </button>
        ))}
        {/* Placement temporaire : la page Réglages hébergera la déconnexion. */}
        <button type="button" className="pk-footitem" onClick={signOut}>
          <IconX size={18} />
          <span className="t">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
