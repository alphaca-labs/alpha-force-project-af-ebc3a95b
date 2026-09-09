"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { CharacterState } from "@repo/domain";
import { SHARE_EXCLUDED_FIELDS, SHARE_PUBLIC_FIELDS } from "@repo/domain";
import { CharacterPanel } from "./character-panel";
import { createShareAction } from "@/lib/actions";

/** 마지막으로 만든 공유 토큰. 같은 결과면 이 토큰의 URL 을 재사용한다(FR-022.AC3). */
const LAST_TOKEN_KEY = "zipsanya.lastShareToken";

export type ResultSummary = {
  readonly propertyName: string;
  readonly areaLabel: string;
  readonly shortfall: string;
  readonly timeline: string;
  readonly achievementRate: number;
  readonly despairIndex: number;
  readonly character: CharacterState;
  readonly characterLabel: string;
  readonly raidMessage: string;
  readonly equipment: readonly string[];
  readonly baseDate: string;
  readonly recommendedScenario: string;
};

export function ResultOverlays({
  overlay,
  summary,
}: {
  readonly overlay: "image" | "share" | null;
  readonly summary: ResultSummary;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [downloadState, setDownloadState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [share, setShare] = useState<{ url: string; reused: boolean } | null>(
    null,
  );
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (overlay && !dialog.open) dialog.showModal();
    if (!overlay && dialog.open) dialog.close();
  }, [overlay]);

  const close = () => router.push("/result");

  async function saveImage() {
    setDownloadState("saving");
    try {
      const response = await fetch("/api/result-image", { cache: "no-store" });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `zipsanya-${summary.propertyName}.png`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDownloadState("saved");
    } catch {
      // 실패해도 현재 결과는 그대로 두고 재시도 수단만 남긴다(FR-021 Edge).
      setDownloadState("error");
    }
  }

  function createShare() {
    startTransition(async () => {
      const last =
        typeof window === "undefined"
          ? undefined
          : (localStorage.getItem(LAST_TOKEN_KEY) ?? undefined);
      const response = await createShareAction(last);
      if (!response.ok) {
        setShareError(response.reason);
        return;
      }
      setShareError(null);
      setShare({ url: response.url, reused: response.reused });
      const token = response.url.split("/share/")[1];
      if (token) localStorage.setItem(LAST_TOKEN_KEY, token);
    });
  }

  async function nativeShare() {
    if (!share) return;
    const data: ShareData = {
      title: "뭐해야집사냐?",
      text: `${summary.propertyName} ${summary.areaLabel} · 부족액 ${summary.shortfall} · 예상 ${summary.timeline}`,
      url: share.url,
    };
    // 지원 기기는 이미지까지 함께 전달한다. 미지원이면 복사·이미지 저장으로 내려간다.
    try {
      const response = await fetch("/api/result-image", { cache: "no-store" });
      if (response.ok && typeof navigator.canShare === "function") {
        const blob = await response.blob();
        const file = new File([blob], "zipsanya.png", { type: "image/png" });
        if (navigator.canShare({ ...data, files: [file] })) {
          await navigator.share({ ...data, files: [file] });
          return;
        }
      }
      if (typeof navigator.share === "function") {
        await navigator.share(data);
        return;
      }
    } catch {
      // 사용자가 취소했거나 지원하지 않는 환경이다. 완료로 표시하지 않는다.
    }
    await copyUrl();
  }

  async function copyUrl() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!overlay) return null;

  return (
    <dialog ref={dialogRef} onClose={close} aria-labelledby="overlay-title">
      {overlay === "image" ? (
        <>
          <div className="dialog-head">
            <div>
              <h2 id="overlay-title">결과 이미지 저장</h2>
              <p className="subtle">1080×1350 세로형 미리보기</p>
            </div>
            <button
              className="dialog-close"
              type="button"
              onClick={close}
              aria-label="닫기"
            >
              닫기
            </button>
          </div>
          <div className="dialog-body">
            <div className="share-preview">
              <span className="tag">{summary.baseDate} 기준</span>
              <h3>
                {summary.propertyName} {summary.areaLabel}까지
              </h3>
              <strong className="gap-number">{summary.shortfall}</strong>
              <CharacterPanel
                state={summary.character}
                label={summary.characterLabel}
                message={summary.raidMessage}
                equipment={summary.equipment}
              />
              <p className="subtle">뭐해야집사냐? · 정보 제공 목적</p>
            </div>
            <p
              id="download-status"
              className={`notice ${downloadState === "error" ? "notice-warning" : "notice-info"}`}
              role="status"
            >
              {downloadState === "error"
                ? "이미지를 만들지 못했어요. 결과는 그대로이니 다시 시도해 주세요."
                : downloadState === "saved"
                  ? "이미지를 저장했어요."
                  : `이미지에는 목표 집·평형·달성률 ${summary.achievementRate}%·절망 지수 ${summary.despairIndex}·캐릭터·장착 장비·레이드 메시지만 담깁니다. 성명·주민등록번호·금융기관 정보는 넣지 않습니다.`}
            </p>
          </div>
          <div className="dialog-actions">
            <button className="button" type="button" onClick={close}>
              취소
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={saveImage}
              disabled={downloadState === "saving"}
            >
              {downloadState === "saving"
                ? "만드는 중…"
                : downloadState === "error"
                  ? "다시 시도"
                  : "이미지 저장"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="dialog-head">
            <div>
              <h2 id="overlay-title">무엇을 공유할까요?</h2>
              <p className="subtle">민감한 원본 입력은 링크에 넣지 않습니다.</p>
            </div>
            <button
              className="dialog-close"
              type="button"
              onClick={close}
              aria-label="닫기"
            >
              닫기
            </button>
          </div>
          <div className="dialog-body stack">
            <p>
              <strong>링크 보유자에게 공개되는 항목</strong>
            </p>
            <ul className="public-field-list">
              {SHARE_PUBLIC_FIELDS.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <p>
              <strong>공유되지 않는 항목</strong>
            </p>
            <ul className="public-field-list">
              {SHARE_EXCLUDED_FIELDS.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            {share ? (
              <div id="share-url" className="notice notice-success">
                <strong>
                  {share.reused
                    ? "같은 조건이라 기존 링크를 다시 씁니다."
                    : "공유 링크가 준비됐어요."}
                </strong>
                <br />
                <span className="numeric">{share.url}</span>
                <br />
                {copied ? (
                  <span className="subtle">주소를 복사했어요.</span>
                ) : null}
              </div>
            ) : null}
            {shareError ? (
              <p className="notice notice-warning" role="status">
                {shareError}
              </p>
            ) : null}
          </div>
          <div className="dialog-actions">
            <button className="button" type="button" onClick={close}>
              취소
            </button>
            {share ? (
              <>
                <button className="button" type="button" onClick={copyUrl}>
                  주소 복사
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={nativeShare}
                >
                  공유하기
                </button>
              </>
            ) : (
              <button
                id="share-create"
                className="button button-primary"
                type="button"
                onClick={createShare}
                disabled={pending}
              >
                {pending ? "만드는 중…" : "공유 링크 만들기"}
              </button>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
