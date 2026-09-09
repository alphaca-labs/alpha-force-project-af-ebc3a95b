"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatKrwShort } from "@repo/domain";
import { adjustAction } from "@/lib/actions";

/** FR-013.AC3 — 마지막 입력 뒤 이 시간 안에 계산 요청을 시작한다. */
const RECALC_DEBOUNCE_MS = 400;

type AreaOption = {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
};

export function AdjustmentPanel({
  initialMonthlySaving,
  initialAnnualIncome,
  areaId,
  areas,
}: {
  readonly initialMonthlySaving: number;
  readonly initialAnnualIncome: number;
  readonly areaId: string;
  readonly areas: readonly AreaOption[];
}) {
  const router = useRouter();
  const [monthlySaving, setMonthlySaving] = useState(initialMonthlySaving);
  const [annualIncome, setAnnualIncome] = useState(initialAnnualIncome);
  const [notice, setNotice] = useState<string | null>(null);
  const [recalculating, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 값 자체는 즉시 화면에 반영하고, 계산 요청만 마지막 입력 뒤로 미룬다.
  // 새 결과가 도착하기 전에는 서버가 만든 이전 결과가 그대로 남아 섞이지 않는다.
  useEffect(() => {
    if (
      monthlySaving === initialMonthlySaving &&
      annualIncome === initialAnnualIncome
    )
      return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const response = await adjustAction({ monthlySaving, annualIncome });
        if (!response.ok)
          setNotice(response.reason ?? "다시 계산할 수 없습니다.");
        else {
          setNotice(null);
          router.refresh();
        }
      });
    }, RECALC_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [
    monthlySaving,
    annualIncome,
    initialMonthlySaving,
    initialAnnualIncome,
    router,
  ]);

  const savingMax = Math.max(initialMonthlySaving * 3, 5_000_000);
  const incomeMax = Math.max(initialAnnualIncome * 3, 200_000_000);

  return (
    <section className="card card-dark stack">
      <div>
        <span className="tag">실시간 조정</span>
        <h2>어느 손잡이를 당길까요?</h2>
      </div>

      <label className="adjustment" htmlFor="saving-range">
        <span className="cluster-between">
          <strong>월 저축</strong>
          <output id="saving-output" className="numeric">
            {formatKrwShort(monthlySaving)}
          </output>
        </span>
        <input
          id="saving-range"
          type="range"
          min={0}
          max={savingMax}
          step={100_000}
          value={monthlySaving}
          onChange={(event) => setMonthlySaving(Number(event.target.value))}
        />
      </label>

      <label className="adjustment" htmlFor="income-range">
        <span className="cluster-between">
          <strong>연소득</strong>
          <output id="income-output" className="numeric">
            {formatKrwShort(annualIncome)}
          </output>
        </span>
        <input
          id="income-range"
          type="range"
          min={0}
          max={incomeMax}
          step={1_000_000}
          value={annualIncome}
          onChange={(event) => setAnnualIncome(Number(event.target.value))}
        />
      </label>

      <div className="field">
        <label htmlFor="area-switch">목표 평형</label>
        <select
          id="area-switch"
          defaultValue={areaId}
          onChange={(event) => {
            const nextId = event.target.value;
            startTransition(async () => {
              const response = await adjustAction({ areaId: nextId });
              if (!response.ok)
                setNotice(response.reason ?? "평형을 바꾸지 못했습니다.");
              else {
                setNotice(null);
                router.refresh();
              }
            });
          }}
        >
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.label}
              {area.available ? "" : " · 시세 확인 불가"}
            </option>
          ))}
        </select>
      </div>

      <p className="subtle" aria-live="polite" id="recalc-status">
        {recalculating
          ? "새 조건으로 다시 계산하는 중…"
          : "값을 바꾸면 자동으로 다시 계산해요."}
      </p>
      {notice ? (
        <p className="notice notice-warning" role="status">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
