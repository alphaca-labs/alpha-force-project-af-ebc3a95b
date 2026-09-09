"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { MaterialSymbol } from "@repo/design-system/components/ui/material-symbol";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type LoginFormValue = {
  login: string;
  password: string;
};

export default function LoginForm() {
  // ⛔ 여기에 자격증명 기본값을 되살리지 마라. 안내 문구만 지우고 이 줄을 남기면 폼이 여전히
  // 자격증명을 자동 입력한 채 렌더돼, 화면 단서만 사라지고 위험은 더 조용해진다.
  const { handleSubmit, register } = useForm<LoginFormValue>({
    defaultValues: { login: "", password: "" },
  });
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("callbackUrl");
  const router = useRouter();

  const _handleSubmit = async (data: LoginFormValue) => {
    const { login, password } = data;
    const result = await signIn("credentials", {
      login,
      password,
      redirectTo: redirectUrl || "/",
      redirect: false,
    });

    if (result?.error) {
      toast.error("로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.");
    } else {
      toast.success("로그인 성공");
      router.replace(redirectUrl || "/");
    }
  };

  return (
    <form onSubmit={handleSubmit(_handleSubmit)}>
      <label className="mb-[7px] block text-[12px] font-semibold tracking-[0.01em] text-n-30">
        아이디
      </label>
      <div className="mb-[18px] flex h-12 items-center gap-2 rounded-lg border border-n-80 bg-card px-3 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
        <MaterialSymbol name="mail" size={20} className="text-n-50" />
        <Input
          {...register("login")}
          placeholder="admin"
          className="h-auto border-0 bg-transparent p-0 text-[15px] shadow-none focus-visible:ring-0"
        />
      </div>

      <label className="mb-[7px] block text-[12px] font-semibold tracking-[0.01em] text-n-30">
        비밀번호
      </label>
      <div className="mb-3.5 flex h-12 items-center gap-2 rounded-lg border border-n-80 bg-card px-3 focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground">
        <MaterialSymbol name="lock" size={20} className="text-n-50" />
        <Input
          {...register("password")}
          type="password"
          placeholder="••••••"
          className="h-auto border-0 bg-transparent p-0 text-[15px] shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="mb-[26px] flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-n-30">
          <span className="flex size-[18px] items-center justify-center rounded bg-foreground text-background">
            <MaterialSymbol name="check" filled size={14} />
          </span>
          로그인 유지
        </label>
        <button
          type="button"
          className="border-b border-n-80 text-[13px] text-n-30"
        >
          비밀번호 찾기
        </button>
      </div>

      <Button
        type="submit"
        className="h-[50px] w-full rounded-full text-[15px] font-semibold shadow-none hover:bg-black"
      >
        로그인
      </Button>

      <p className="mt-5 text-center text-[12.5px] text-n-50">
        계정이 없으신가요?{" "}
        <span className="cursor-pointer border-b border-n-80 text-foreground">
          관리자에게 문의
        </span>
      </p>
    </form>
  );
}
