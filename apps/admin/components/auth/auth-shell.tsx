import type { ReactNode } from "react";

/** ADM-P01~P06 공통 셸. 인증 화면에는 캐릭터·운영 데이터를 두지 않는다. */
export function AuthShell({
  code,
  title,
  description,
  children,
  wide = false,
}: {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly wide?: boolean;
}) {
  return (
    <main id="main-content" className="flex min-h-screen bg-surface-low">
      <aside className="hidden w-[38%] flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <span className="text-[18px] font-bold tracking-[-0.02em]">
          뭐해야집사냐? 운영
        </span>
        <div>
          <p className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">
            정확한 숫자는
            <br />
            정확한 운영에서.
          </p>
          <p className="mt-4 text-[13.5px] opacity-70">
            승인된 관리자만 접근할 수 있습니다. 공개 가입은 없습니다.
          </p>
        </div>
        <span className="text-[12px] opacity-60">© 뭐해야집사냐?</span>
      </aside>
      <section className="flex flex-1 items-center justify-center p-6">
        <div className={wide ? "w-full max-w-[720px]" : "w-full max-w-[440px]"}>
          <div className="mb-6">
            <span className="font-mono text-[11px] text-n-50">{code}</span>
            <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em]">
              {title}
            </h1>
            <p className="mt-2 text-[13.5px] text-n-50">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthNotice({
  error,
  notice,
}: {
  readonly error: string | null;
  readonly notice: string | null;
}) {
  if (!error && !notice) return null;
  return (
    <div
      role="alert"
      className={
        error
          ? "mb-4 rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive"
          : "mb-4 rounded-[10px] border border-n-90 bg-secondary px-4 py-3 text-[13px] text-foreground"
      }
    >
      {error ?? notice}
    </div>
  );
}
