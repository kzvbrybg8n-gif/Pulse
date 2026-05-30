import type { ComponentType } from "react";
import {
  IconRepeat,
  IconSettings,
  IconSun,
  IconTimer,
  type IconProps,
} from "@/components/icons";

type Tab = {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
  active?: boolean;
};

const TABS: Tab[] = [
  { id: "today", label: "Tâches", Icon: IconSun, active: true },
  { id: "habits", label: "Habitudes", Icon: IconRepeat },
  { id: "focus", label: "Focus", Icon: IconTimer },
  { id: "settings", label: "Réglages", Icon: IconSettings },
];

export function MobileTabs() {
  return (
    <div className="pm-tabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={"pm-tab" + (t.active ? " active" : "")}
        >
          <t.Icon size={22} />
          <span className="lab">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
