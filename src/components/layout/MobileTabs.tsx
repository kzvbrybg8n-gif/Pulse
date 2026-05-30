"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  IconRepeat,
  IconSettings,
  IconSun,
  IconTimer,
} from "@/components/icons";

type Tab = {
  id: string;
  label: string;
  Icon: (p: { size?: number }) => React.ReactElement;
  href: string;
};

const TABS: Tab[] = [
  { id: "today", label: "Tâches", Icon: IconSun, href: "/" },
  { id: "habits", label: "Habitudes", Icon: IconRepeat, href: "/habits" },
  { id: "focus", label: "Focus", Icon: IconTimer, href: "/focus" },
  { id: "settings", label: "Réglages", Icon: IconSettings, href: "/settings" },
];

export function MobileTabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="pm-tabs">
      {TABS.map((t) => {
        const isActive =
          t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <button
            key={t.id}
            type="button"
            className={"pm-tab" + (isActive ? " active" : "")}
            onClick={() => router.push(t.href)}
          >
            <t.Icon size={22} />
            <span className="lab">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
