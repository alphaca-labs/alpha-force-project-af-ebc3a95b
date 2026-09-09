"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FinanceValues } from "@repo/domain";
import { submitFinanceAction, type FinanceFormState } from "@/lib/actions";

const FIELDS = [
  {
    name: "assets",
    label: "보유 자산",
    required: true,
    help: "예금·투자자산 중 실제로 사용할 금액",
  },
  {
    name: "annualIncome",
    label: "연소득",
    required: true,
    help: "세전 가구 합산 기준 (0원도 입력할 수 있어요)",
  },
  {
    name: "monthlySaving",
    label: "월 저축",
    required: true,
    help: "현재 유지 가능한 월평균 (0원도 입력할 수 있어요)",
  },
  {
    name: "existingLoanBalance",
    label: "기존 대출 잔액",
    required: false,
    help: "없으면 비워 두면 0원으로 계산해요",
  },
  {
    name: "existingAnnualRepayment",
    label: "연 원리금 상환액",
    required: false,
    help: "기존 대출의 연간 상환액",
  },
] as const;

const INITIAL: FinanceFormState = { errors: {}, summary: null };

export function FinanceForm({
  defaults,
}: {
  readonly defaults: FinanceValues | null;
}) {
  const [state, formAction, pending] = useActionState(
    submitFinanceAction,
    INITIAL,
  );
  const summaryRef = useRef<HTMLDivElement>(null);

  // 오류 요약이 나오면 요약에 초점을 옮긴다. 요약 안의 링크로 첫 오류 필드까지 갈 수 있다.
  useEffect(() => {
    if (state.summary) summaryRef.current?.focus();
  }, [state.summary]);

  const firstError = Object.keys(state.errors)[0];

  return (
    <form
      action={formAction}
      id="finance-form"
      className="card-strong stack"
      noValidate
    >
      <div
        id="finance-errors"
        ref={summaryRef}
        className="error-summary"
        tabIndex={-1}
        role="alert"
        hidden={!state.summary}
      >
        <strong>{state.summary}</strong>
        {firstError ? (
          <p className="field-error">
            <a href={`#${firstError}`}>
              {FIELDS.find((f) => f.name === firstError)?.label} 항목으로 이동
            </a>{" "}
            — {state.errors[firstError]}
          </p>
        ) : null}
      </div>
      <h2>내 재무 조건</h2>
      <div className="form-grid">
        {FIELDS.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>
              {field.label}
              {field.required ? " · 필수" : ""}
            </label>
            <div className="currency-wrap">
              <input
                id={field.name}
                name={field.name}
                inputMode="numeric"
                defaultValue={defaults ? String(defaults[field.name]) : ""}
                aria-describedby={`${field.name}-help`}
                aria-invalid={state.errors[field.name] ? true : undefined}
              />
              <span className="currency-unit">원</span>
            </div>
            <p id={`${field.name}-help`} className="field-help">
              {field.help}
            </p>
            {state.errors[field.name] ? (
              <p className="field-error">{state.errors[field.name]}</p>
            ) : null}
          </div>
        ))}
      </div>
      <button
        className="button button-accent button-block"
        type="submit"
        disabled={pending}
      >
        {pending ? "계산 중…" : "내 격차 계산하기"}
      </button>
    </form>
  );
}
