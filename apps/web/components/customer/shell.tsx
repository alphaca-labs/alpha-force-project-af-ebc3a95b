import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "집 찾기" },
  { href: "/finance", label: "계산" },
  { href: "/roadmap", label: "로드맵" },
  { href: "/checklist", label: "체크" },
] as const;

export function CustomerHeader({ current }: { readonly current: string }) {
  return (
    <header className="customer-header">
      <div className="header-inner container">
        <Link href="/" className="wordmark">
          뭐해야집사냐?
        </Link>
        <nav id="customer-nav" className="customer-nav" aria-label="주요 단계">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === current ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function CustomerFooter() {
  return (
    <footer>
      <div className="marquee-footer" aria-hidden="true">
        <div className="marquee-track">
          <span>집값은 크고</span>
          <span>계획은 쪼갠다</span>
          <span>오늘 할 일은 작게</span>
          <span>숫자는 또렷하게</span>
        </div>
      </div>
      <div className="footer-note">
        <div className="container">
          <span>뭐해야집사냐?</span>
          <span>계산 결과는 정보 제공 목적이며 금융 자문이 아닙니다.</span>
        </div>
      </div>
    </footer>
  );
}

export function ScreenHead({
  code,
  title,
  description,
  action,
}: {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) {
  return (
    <header className="screen-head">
      <div>
        <span className="screen-code">{code}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="cluster">{action}</div> : null}
    </header>
  );
}

export function CustomerPage({
  current,
  children,
}: {
  readonly current: string;
  readonly children: ReactNode;
}) {
  return (
    <>
      <CustomerHeader current={current} />
      <main id="main-content" className="page-main">
        <div className="container">{children}</div>
      </main>
      <CustomerFooter />
    </>
  );
}
