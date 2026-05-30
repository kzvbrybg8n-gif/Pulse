import { IconFlag } from "@/components/icons";
import { PRIO } from "@/lib/mocks/today";
import type { Priority } from "@/lib/types";

type Props = {
  prio: Priority;
  size?: number;
};

export function PriorityFlag({ prio, size = 16 }: Props) {
  const p = PRIO[prio];
  if (!p) return null;
  return <IconFlag size={size} filled={p.filled} sw={p.sw} color={`var(${p.varName})`} />;
}
