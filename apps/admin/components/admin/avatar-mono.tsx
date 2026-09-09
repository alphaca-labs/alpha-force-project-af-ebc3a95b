import {
  Avatar,
  AvatarFallback,
} from "@repo/design-system/components/ui/avatar";
import { AVATAR_COLORS, type AvatarTone } from "@/lib/mock";

/** 모노크롬 이니셜 아바타 — DS `Avatar` + `AvatarFallback` 합성. 3색 변형만 허용. */
export function AvatarMono({
  initial,
  tone,
  size = 38,
}: {
  initial: string;
  tone: AvatarTone;
  size?: number;
}) {
  const c = AVATAR_COLORS[tone];
  return (
    <Avatar style={{ width: size, height: size }}>
      <AvatarFallback
        className="font-semibold"
        style={{ background: c.bg, color: c.fg, fontSize: Math.round(size * 0.37) }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
