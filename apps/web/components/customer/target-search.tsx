"use client";

import { useActionState, useState, useTransition } from "react";
import { formatKrwShort } from "@repo/domain";
import type { PropertySummary } from "@/lib/repository";
import { searchAction, selectAreaAction } from "@/lib/actions";

const TYPES = [
  { value: "", label: "전체" },
  { value: "APARTMENT", label: "아파트" },
  { value: "OFFICETEL", label: "오피스텔" },
] as const;

export function TargetSearch({
  featured,
  featuredLimit,
  searchLimit,
  selectedAreaId,
}: {
  readonly featured: readonly PropertySummary[];
  readonly featuredLimit: number;
  readonly searchLimit: number;
  readonly selectedAreaId: string | null;
}) {
  const [state, formAction, searching] = useActionState(searchAction, {
    properties: [] as readonly PropertySummary[],
    error: null as string | null,
    query: "",
  });
  const [selected, setSelected] = useState<PropertySummary | null>(
    featured.find((p) => p.areas.some((a) => a.id === selectedAreaId)) ?? null,
  );
  const [areaId, setAreaId] = useState<string>(
    selectedAreaId ??
      featured[0]?.areas.find((a) => a.price.status === "available")?.id ??
      "",
  );
  const [pending, startTransition] = useTransition();

  const searched = state.query.length > 0;
  const list = searched ? state.properties : featured;
  const active = selected ?? list[0] ?? null;
  const activeAreas = active?.areas ?? [];
  const currentArea =
    activeAreas.find((a) => a.id === areaId) ?? activeAreas[0] ?? null;

  return (
    <div className="workbench">
      <section
        className="card-strong search-panel"
        aria-labelledby="target-search-title"
      >
        <h2 id="target-search-title">어느 집을 노려볼까요?</h2>
        <form action={formAction} className="stack">
          <fieldset className="field choice-row">
            <legend>주택 유형</legend>
            {TYPES.map((type, index) => (
              <label className="choice" key={type.value || "all"}>
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  defaultChecked={index === 0}
                />
                <span>{type.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor="property-search">지역·단지 검색</label>
            <input
              id="property-search"
              name="query"
              className="search-input"
              type="search"
              minLength={2}
              maxLength={20}
              defaultValue={state.query}
              aria-controls="property-results"
              aria-describedby="property-search-help"
            />
            <p id="property-search-help" className="field-help">
              2자부터 검색해요. 추천은 최대 {featuredLimit}개, 검색 결과는 최대{" "}
              {searchLimit}개까지 보여 줍니다.
            </p>
            {state.error ? <p className="field-error">{state.error}</p> : null}
          </div>
          <button className="button" type="submit" disabled={searching}>
            {searching ? "검색 중…" : "검색"}
          </button>
        </form>
        <div
          id="property-results"
          className="search-results"
          role="listbox"
          aria-label={searched ? "검색 결과" : "추천 매물"}
        >
          {list.length === 0 ? (
            <p className="notice notice-info">
              조건에 맞는 단지를 찾지 못했어요. 지역명이나 단지명을 조금 더 짧게
              입력해 보세요.
            </p>
          ) : (
            list.map((property) => (
              <button
                type="button"
                key={property.id}
                className="property-result"
                role="option"
                aria-selected={active?.id === property.id}
                onClick={() => {
                  setSelected(property);
                  const first =
                    property.areas.find(
                      (a) => a.price.status === "available",
                    ) ?? property.areas[0];
                  setAreaId(first?.id ?? "");
                }}
              >
                <span className="property-name">{property.name}</span>
                <span className="property-meta">
                  {property.region} · {property.typeLabel}
                </span>
                <span className="property-price">
                  {property.headlinePrice === null
                    ? "가격 확인 필요"
                    : formatKrwShort(property.headlinePrice)}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <aside className="stack">
        {active && currentArea ? (
          <section className="card card-pear" aria-labelledby="chosen-home">
            <span className="tag">선택한 목표</span>
            <h2 id="chosen-home">{active.name}</h2>
            <p className="subtle">
              {active.address} · {active.typeLabel}
            </p>
            <strong className="goal-price">
              {currentArea.price.status === "available"
                ? formatKrwShort(currentArea.price.price)
                : "시세 확인 불가"}
            </strong>
            <div className="field">
              <label htmlFor="area-select">전용면적</label>
              <select
                id="area-select"
                value={currentArea.id}
                onChange={(event) => setAreaId(event.target.value)}
              >
                {activeAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.label} ·{" "}
                    {area.price.status === "available"
                      ? formatKrwShort(area.price.price)
                      : "시세 확인 불가"}
                  </option>
                ))}
              </select>
            </div>
            {currentArea.price.status === "available" ? (
              <button
                className="button button-primary button-block"
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const data = new FormData();
                    data.set("areaId", currentArea.id);
                    await selectAreaAction(data);
                  })
                }
              >
                {pending ? "이동 중…" : "이 집으로 계산하기"}
              </button>
            ) : (
              <p className="notice notice-warning">
                <strong>시세 확인 불가</strong>
                <br />이 평형은 최근 12개월 안에 거래가 없어 계산을 시작할 수
                없어요. 다른 평형이나 단지를 골라 주세요.
              </p>
            )}
          </section>
        ) : (
          <section className="card">
            <h2>목표를 골라 주세요</h2>
            <p className="subtle">
              왼쪽 목록에서 단지를 선택하면 평형과 목표 가격을 확인할 수 있어요.
            </p>
          </section>
        )}
        <div className="source-note">
          <strong>가격 기준</strong>
          <br />
          {currentArea && currentArea.price.status === "available"
            ? `${currentArea.price.baseDate} 기준 · ${currentArea.price.sourceLabel}${
                currentArea.price.windowMonths
                  ? ` · 최근 ${currentArea.price.windowMonths}개월 ${currentArea.price.sampleCount}건 중위가격`
                  : ""
              }`
            : "실거래와 공개 시세 자료를 함께 확인하세요."}
        </div>
      </aside>
    </div>
  );
}
