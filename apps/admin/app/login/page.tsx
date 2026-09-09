import { Suspense } from "react";
import LoginForm from "@/components/form/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel */}
      <div className="hidden flex-col justify-between bg-foreground px-[60px] py-14 text-n-95 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[9px] bg-background text-[19px] font-extrabold text-foreground">
            O
          </span>
          <span className="text-[20px] font-bold tracking-[-0.02em]">
            omniseed
          </span>
        </div>
        <div>
          <div className="mb-5 font-mono text-[12px] uppercase tracking-[0.12em] text-n-60">
            Admin Console
          </div>
          <h1 className="m-0 max-w-[13ch] text-[40px] font-semibold leading-[1.18] tracking-[-0.025em]">
            서비스 운영을
            <br />한 곳에서.
          </h1>
          <p className="mt-[18px] max-w-[34ch] text-[15px] leading-relaxed text-n-80">
            회원, 콘텐츠, 결제 데이터를 실시간으로 확인하고 관리하세요.
          </p>
        </div>
        <div className="font-mono text-[12px] text-n-60">
          © 2026 omniseed · v2.0
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[360px]">
          <h2 className="mb-1.5 text-[26px] font-semibold tracking-[-0.02em]">
            로그인
          </h2>
          <p className="mb-8 text-[14px] text-n-30">관리자 계정으로 접속하세요.</p>
          <Suspense fallback={<div className="text-n-50">로딩 중…</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
