import type { RoadmapMission } from "./types";

/** FR-019 · FR-020 — 브라우저 로컬 저장 스키마. 형태가 바뀌면 버전을 올린다. */
export const CHECKLIST_STORAGE_VERSION = 1;
export const CHECKLIST_STORAGE_KEY = "zipsanya.checklist.v1";

export type ChecklistState = {
  readonly schemaVersion: number;
  readonly checklistId: string;
  /** missionId → 변경 시각(ISO) */
  readonly completed: Record<string, string>;
  readonly noticeAcknowledged: boolean;
};

export function emptyChecklist(checklistId: string): ChecklistState {
  return {
    schemaVersion: CHECKLIST_STORAGE_VERSION,
    checklistId,
    completed: {},
    noticeAcknowledged: false,
  };
}

/**
 * 저장된 값을 읽는다. **손상된 항목만 버리고 나머지는 유지한다**(FR-020 Edge).
 * 전체를 통째로 초기화하지 않는 것이 이 함수의 계약이다.
 */
export function parseChecklist(
  raw: string | null,
  checklistId: string,
): {
  readonly state: ChecklistState;
  readonly repaired: boolean;
} {
  if (!raw) return { state: emptyChecklist(checklistId), repaired: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: emptyChecklist(checklistId), repaired: true };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { state: emptyChecklist(checklistId), repaired: true };
  }
  const record = parsed as Record<string, unknown>;
  let repaired = false;

  if (record.schemaVersion !== CHECKLIST_STORAGE_VERSION) repaired = true;

  const completed: Record<string, string> = {};
  const rawCompleted = record.completed;
  if (typeof rawCompleted === "object" && rawCompleted !== null) {
    for (const [key, value] of Object.entries(
      rawCompleted as Record<string, unknown>,
    )) {
      if (
        typeof key === "string" &&
        key.length > 0 &&
        typeof value === "string" &&
        !Number.isNaN(Date.parse(value))
      ) {
        completed[key] = value;
      } else {
        repaired = true;
      }
    }
  } else if (rawCompleted !== undefined) {
    repaired = true;
  }

  return {
    state: {
      schemaVersion: CHECKLIST_STORAGE_VERSION,
      checklistId:
        typeof record.checklistId === "string"
          ? record.checklistId
          : checklistId,
      completed,
      noticeAcknowledged: record.noticeAcknowledged === true,
    },
    repaired,
  };
}

/** 진행률 요약(FR-019.AC2). 로드맵에서 사라진 미션은 화면에서 제외하되 저장값은 지우지 않는다. */
export function progressOf(
  missions: readonly RoadmapMission[],
  completed: Record<string, string>,
) {
  const count = (list: readonly RoadmapMission[]) => ({
    total: list.length,
    done: list.filter((m) => completed[m.id]).length,
    rate:
      list.length === 0
        ? 0
        : Math.round(
            (list.filter((m) => completed[m.id]).length / list.length) * 1000,
          ) / 10,
  });
  return {
    all: count(missions),
    weekly: count(missions.filter((m) => m.cadence === "WEEKLY")),
    monthly: count(missions.filter((m) => m.cadence === "MONTHLY")),
  };
}
