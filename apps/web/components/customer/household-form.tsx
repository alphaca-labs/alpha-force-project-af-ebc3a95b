"use client";

import { useState } from "react";
import type { HouseholdValues } from "@repo/domain";
import { saveHouseholdAction } from "@/lib/actions";

/**
 * FR-015 — 선택 가구 정보.
 *
 * 어떤 항목도 필수가 아니고, 비워 두면 그 조건을 요구하는 상품이 «확인 필요» 로 남는다.
 * 개인 식별번호·증빙 파일은 받지 않는다.
 */
export function HouseholdForm({
  defaults,
}: {
  readonly defaults: HouseholdValues;
}) {
  const [marital, setMarital] = useState<string>(defaults.maritalStatus ?? "");

  const triState = (name: keyof HouseholdValues, label: string) => (
    <div className="field" key={name}>
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        defaultValue={
          defaults[name] === null ? "" : defaults[name] ? "yes" : "no"
        }
      >
        <option value="">선택 안 함</option>
        <option value="yes">예</option>
        <option value="no">아니오</option>
      </select>
    </div>
  );

  return (
    <form action={saveHouseholdAction} className="card stack">
      <h3>우대 조건 판정용 가구 정보 (선택)</h3>
      <p className="field-help">
        비워 두면 그 조건을 요구하는 상품은 «확인 필요» 로 남습니다. 임의로
        적격으로 보지 않습니다.
      </p>
      <div className="form-grid">
        {triState("noHome", "무주택 여부")}
        {triState("firstTime", "생애최초 여부")}
        <div className="field">
          <label htmlFor="maritalStatus">혼인 상태</label>
          <select
            id="maritalStatus"
            name="maritalStatus"
            value={marital}
            onChange={(event) => setMarital(event.target.value)}
          >
            <option value="">선택 안 함</option>
            <option value="SINGLE">미혼</option>
            <option value="MARRIED">기혼</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="marriageMonths">혼인 기간 (개월)</label>
          <input
            id="marriageMonths"
            name="marriageMonths"
            inputMode="numeric"
            defaultValue={defaults.marriageMonths ?? ""}
            disabled={marital !== "MARRIED"}
          />
          {marital !== "MARRIED" ? (
            <p className="field-help">기혼을 선택하면 입력할 수 있어요.</p>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="householdSize">가구원 수</label>
          <input
            id="householdSize"
            name="householdSize"
            inputMode="numeric"
            defaultValue={defaults.householdSize ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="dependents">부양가족 수</label>
          <input
            id="dependents"
            name="dependents"
            inputMode="numeric"
            defaultValue={defaults.dependents ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="age">연령</label>
          <input
            id="age"
            name="age"
            inputMode="numeric"
            defaultValue={defaults.age ?? ""}
          />
        </div>
      </div>
      <button className="button button-block" type="submit">
        자격 다시 판정
      </button>
    </form>
  );
}
