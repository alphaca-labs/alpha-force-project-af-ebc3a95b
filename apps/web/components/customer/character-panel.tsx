import type { CharacterState } from "@repo/domain";

/**
 * 상태별 픽셀 캐릭터. 스프라이트 한 장(2172×724)의 세 셀 중 하나를 잘라 쓴다.
 * 상태 → 셀 위치는 `product.css` 의 `.character-crop[data-state]` 가 소유한다.
 */
const CSS_STATE: Record<CharacterState, "comfortable" | "adjusting" | "tight"> =
  {
    COMFORTABLE: "comfortable",
    GRINDING: "adjusting",
    IMPOSSIBLE: "tight",
  };

const BADGE: Record<CharacterState, string> = {
  COMFORTABLE: "status-success",
  GRINDING: "status-warning",
  IMPOSSIBLE: "status-danger",
};

export function CharacterPanel({
  state,
  label,
  message,
  equipment,
}: {
  readonly state: CharacterState;
  readonly label: string;
  readonly message: string;
  readonly equipment?: readonly string[];
}) {
  return (
    <div className="character-panel">
      <div className="character-crop" data-state={CSS_STATE[state]}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/status-characters.png"
          alt={`현재 조건이 ${label}인 직장인 픽셀 캐릭터`}
          fetchPriority="high"
        />
      </div>
      <div>
        <span className={`status-badge ${BADGE[state]}`}>{label}</span>
        <h3>오늘의 레이드 메시지</h3>
        <p>{message}</p>
        {equipment && equipment.length > 0 ? (
          <p className="subtle">장착 장비 · {equipment.join(" · ")}</p>
        ) : null}
      </div>
    </div>
  );
}
