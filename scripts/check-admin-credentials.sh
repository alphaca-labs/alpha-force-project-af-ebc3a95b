#!/usr/bin/env bash
# apps/admin 의 인증 파일에 자격증명 리터럴이 다시 들어오는 것을 막는다.
#
# 왜 필요한가: 이 템플릿의 `apps/admin/auth.ts` 는 한때 `login === "admin" && password === "1234"` 를
# 그대로 통과시켰고, 파생 저장소 24개가 같은 분기를 물려받았다(2026-08-06 org 전수 스윕 실측).
# `scripts/bootstrap.mjs` 는 디렉터리 prune 전용이라 템플릿 수정이 기존 파생본에 전파되지 않으므로,
# 최소한 «템플릿과 이후 파생본에서는 다시 생기지 않는다» 를 CI 로 고정한다.
#
# 판정 규칙
#   - 주석 줄은 제외한다. auth.ts 의 «다시 넣지 마라» 주석이 문제의 리터럴을 인용하고 있다.
#   - `typeof x === "string"` 같은 타입 가드는 제외한다(리터럴 비교가 아니다).
#   - 남은 줄에서 login/password 계열 식별자와 따옴표 리터럴의 등호 비교를 찾으면 실패한다.
set -uo pipefail

targets=$(git ls-files 'apps/admin/**/auth.ts' 'apps/admin/auth.ts' 2>/dev/null | sort -u)
if [ -z "$targets" ]; then
  echo "apps/admin 인증 파일이 없습니다 — 검사 대상 없음."
  exit 0
fi

status=0
for file in $targets; do
  hits=$(grep -nE '.*' "$file" \
    | grep -vE '^[0-9]+:[[:space:]]*(//|\*|/\*)' \
    | grep -vE 'typeof' \
    | grep -inE '(password|passwd|pw|login|username)[[:space:]]*==={0,1}[[:space:]]*["'"'"'][^"'"'"']*["'"'"']' || true)
  if [ -n "$hits" ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      lineno=${line%%:*}
      echo "::error file=$file,line=$lineno::자격증명 리터럴 비교가 있습니다. 환경변수 + timingSafeEquals 로 바꾸세요 — ${line#*:}"
    done <<< "$hits"
    status=1
  fi
done

if [ "$status" -eq 0 ]; then
  echo "apps/admin 인증 파일에 자격증명 리터럴이 없습니다."
fi
exit "$status"
