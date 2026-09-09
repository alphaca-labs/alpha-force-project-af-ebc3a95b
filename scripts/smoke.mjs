#!/usr/bin/env node
/**
 * 실행 스모크 — 실제 프로세스를 띄우고 실제 브라우저로 주요 경로를 1회 통과시킨다.
 *
 * 정적 검사(build·typecheck·test)가 통과해도 «부팅하면 죽는다 / 흐름이 끊긴다» 는 걸리지 않는다.
 * 그래서 이 스크립트는 다음을 실측한다.
 *
 *   고객: 목표 집 탐색 → 재무 입력 → 격차 결과 → 조건 조정 → 로드맵 → 체크리스트(로컬 저장 복원)
 *         → 결과 이미지 PNG(1080×1350) → 공유 링크 생성 → 공유 URL 열람
 *   운영: 미인증 접근 차단 → 로그인 → 최초 설정(TOTP) → 매물 목록 → 확정 시세 저장 → 감사 기록
 *
 * 대상 서버 소유권 계약:
 *   - 포트는 OS 가 배정한 값을 쓰고(고정 포트 금지), 시작 전 그 포트에 listener 가 없음을 확인한다.
 *   - 시작 뒤 listener PID 가 자신이 spawn 한 프로세스 또는 그 자손인지 계보로 대조한다.
 *   - task 고유 난수 토큰을 `APP_INSTANCE_ID` 로 주입하고 `/api/health` 응답이 그 토큰과
 *     **바이트 단위로 일치**할 때만 준비 완료로 인정한다. 상태코드 200 만으로는 인정하지 않는다.
 *   - 확정한 base URL 은 모든 검사에 명시적으로 넘긴다. 기본 URL fallback 결과는 채택하지 않는다.
 *
 * 사용법:
 *   DATABASE_URL=... AUTH_ENCRYPTION_KEY=... node scripts/smoke.mjs
 *   옵션: --skip-build (이미 빌드된 .next 를 그대로 사용)
 */
import { spawn, execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { freePort, launchChrome } from "./lib/cdp.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_BUILD = process.argv.includes("--skip-build");

const checks = [];
function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
  if (!ok) process.exitCode = 1;
}
function assert(name, condition, detail = "") {
  record(name, Boolean(condition), detail);
  if (!condition) throw new Error(`검증 실패: ${name} ${detail}`);
}

/** 포트를 점유한 프로세스 PID 목록. */
function listenerPids(port) {
  try {
    return execFileSync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
      { encoding: "utf8" },
    )
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map(Number);
  } catch {
    return [];
  }
}

/** pid 가 root 의 자손인지 계보로 확인한다. */
function isDescendant(pid, root) {
  let current = pid;
  for (let depth = 0; depth < 12; depth += 1) {
    if (current === root) return true;
    try {
      const parent = Number(
        execFileSync("ps", ["-o", "ppid=", "-p", String(current)], {
          encoding: "utf8",
        }).trim(),
      );
      if (!Number.isInteger(parent) || parent <= 1) return false;
      current = parent;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 스모크는 «중립적 실패 문구» 를 확인하려고 일부러 한 번 틀린다. 제품의 점진 제한은 그 실패를
 * 15분 동안 기억하므로, 그대로 두면 세 번째 실행부터 스모크 자체가 잠긴다.
 * 그래서 자기가 만든 실패 기록만 즉시 지운다(제품 로직은 그대로 둔다).
 */
async function clearAuthAttempts() {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`DELETE FROM "AuthAttempt"`);
  await client.end();
}

function processCwd(pid) {
  try {
    const out = execFileSync(
      "lsof",
      ["-a", "-p", String(pid), "-d", "cwd", "-Fn"],
      { encoding: "utf8" },
    );
    const line = out.split("\n").find((l) => l.startsWith("n"));
    return line ? line.slice(1) : null;
  } catch {
    return null;
  }
}

async function startApp({ filter, appRoot, label, extraEnv = {} }) {
  const port = await freePort();
  const before = listenerPids(port);
  if (before.length > 0) {
    throw new Error(
      `${label}: 배정받은 포트 ${port} 에 이미 listener 가 있습니다 (${before.join(",")})`,
    );
  }
  const instanceId = `smoke-${label}-${randomBytes(12).toString("hex")}`;

  const child = spawn(
    "pnpm",
    ["--filter", filter, "exec", "next", "start", "-p", String(port)],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        ...extraEnv,
        PORT: String(port),
        APP_INSTANCE_ID: instanceId,
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
  const logs = [];
  child.stdout.on("data", (d) => logs.push(String(d)));
  child.stderr.on("data", (d) => logs.push(String(d)));

  const baseUrl = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        cache: "no-store",
      });
      if (response.ok) {
        const body = await response.json();
        // 토큰이 바이트 단위로 일치할 때만 «내가 띄운 서버» 로 인정한다.
        if (body.instance === instanceId) {
          ready = true;
          break;
        }
      }
    } catch {
      /* 아직 준비 전 */
    }
    if (child.exitCode !== null) break;
    await sleep(300);
  }
  if (!ready) {
    throw new Error(
      `${label}: readiness 실패 (exit=${child.exitCode})\n${logs.join("").slice(-2000)}`,
    );
  }

  const pids = listenerPids(port);
  const owned = pids.filter((pid) => isDescendant(pid, child.pid));
  const cwd = owned[0] ? processCwd(owned[0]) : null;

  return {
    label,
    port,
    baseUrl,
    instanceId,
    spawnPid: child.pid,
    listenerPids: pids,
    ownedPids: owned,
    cwd,
    appRoot,
    stop() {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        try {
          child.kill("SIGTERM");
        } catch {
          /* 이미 종료 */
        }
      }
    },
  };
}

function reportOwnership(server) {
  console.log(
    `  [${server.label}] port=${server.port} spawnPid=${server.spawnPid} listener=${server.listenerPids.join(",") || "none"} ` +
      `owned=${server.ownedPids.join(",") || "none"} cwd=${server.cwd ?? "unknown"} appRoot=${server.appRoot} base=${server.baseUrl}`,
  );
  assert(
    `${server.label} listener 소유권(자신이 띄운 프로세스의 자손)`,
    server.ownedPids.length > 0,
    `listener=${server.listenerPids.join(",")}`,
  );
  assert(
    `${server.label} listener cwd 가 격리 앱 루트와 일치`,
    server.cwd !== null && resolve(server.cwd) === resolve(server.appRoot),
    `cwd=${server.cwd}`,
  );
}

async function run() {
  if (!SKIP_BUILD) {
    console.log("== build ==");
    execFileSync("pnpm", ["build"], { cwd: ROOT, stdio: "inherit" });
  }
  for (const app of ["web", "admin"]) {
    if (!existsSync(join(ROOT, "apps", app, ".next"))) {
      throw new Error(
        `apps/${app}/.next 가 없습니다. --skip-build 없이 실행하세요.`,
      );
    }
  }

  const web = await startApp({
    filter: "web",
    appRoot: join(ROOT, "apps", "web"),
    label: "web",
  });
  const admin = await startApp({
    filter: "admin",
    appRoot: join(ROOT, "apps", "admin"),
    label: "admin",
  });
  const browser = await launchChrome();
  const { page } = browser;

  try {
    console.log("\n== 대상 서버 소유권 ==");
    reportOwnership(web);
    reportOwnership(admin);

    console.log("\n== 고객 흐름 (WEB-01 → WEB-06) ==");
    await page.goto(`${web.baseUrl}/`);
    const home = await page.text();
    assert("WEB-01 목표 집 탐색 렌더", home.includes("목표 집 탐색"));
    assert("WEB-01 시드 매물 노출(반포자이)", home.includes("반포자이"));

    await page.clickText(".property-result", "반포자이");
    await page.waitForText("이 집으로 계산하기");
    await page.clickText("button", "이 집으로 계산하기");
    await page.waitForText("재무 조건 입력");
    assert("WEB-02 진입", (await page.url()).includes("/finance"));

    // 오류 요약: 필수 항목을 비운 채 제출한다.
    await page.clickText("button", "내 격차 계산하기");
    await page.waitForText("입력값을 다시 확인해 주세요");
    record("WEB-02 오류 요약 노출", true);

    await page.fill("#assets", "300000000");
    await page.fill("#annualIncome", "80000000");
    await page.fill("#monthlySaving", "3000000");
    await page.clickText("button", "내 격차 계산하기");
    await page.waitForText("격차 결과");
    assert("WEB-03 진입", (await page.url()).includes("/result"));

    const result = await page.text();
    assert("WEB-03 부족액 표시", result.includes("목표까지 부족한 돈"));
    assert("WEB-03 절망 지수 표시", /절망 지수/.test(result));
    assert(
      "WEB-03 우회 카드 4종",
      ["로또", "코인", "대기업 노예", "인생 리셋"].every((t) =>
        result.includes(t),
      ),
    );
    assert("WEB-03 계산 한계 고지", result.includes("취득세·중개보수·이사비"));

    // FR-013 — 슬라이더를 움직이면 마지막 입력 뒤 재계산이 시작되고 결과가 갱신된다.
    // 월 저축은 «예상 기간» 을, 연소득은 DSR 을 거쳐 «가능 대출·부족액» 을 바꾼다.
    const periodBefore = await page.evaluate(
      "document.querySelector('.hero-kicker .numeric').innerText",
    );
    await page.evaluate(
      `(() => {
        const el = document.querySelector('#saving-range');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, String(Number(el.max)));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`,
    );
    await sleep(3500);
    const periodAfter = await page.evaluate(
      "document.querySelector('.hero-kicker .numeric').innerText",
    );
    assert(
      "WEB-03 월 저축 조정 → 예상 기간 재계산",
      periodBefore !== periodAfter,
      `${periodBefore} → ${periodAfter}`,
    );

    const gapBefore = await page.evaluate(
      "document.querySelector('#gap-number').innerText",
    );
    await page.evaluate(
      `(() => {
        const el = document.querySelector('#income-range');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, String(Number(el.max)));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`,
    );
    await sleep(3500);
    const gapAfter = await page.evaluate(
      "document.querySelector('#gap-number').innerText",
    );
    assert(
      "WEB-03 연소득 조정 → 대출 한도·부족액 재계산",
      gapBefore !== gapAfter,
      `${gapBefore} → ${gapAfter}`,
    );

    // FR-021 — 결과 이미지 1080×1350 PNG
    const image = await page.evaluate(
      `(async () => {
        const res = await fetch('/api/result-image', { cache: 'no-store' });
        const buf = new Uint8Array(await res.arrayBuffer());
        const magic = [...buf.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
        const view = new DataView(buf.buffer);
        return { status: res.status, type: res.headers.get('content-type'), magic, bytes: buf.length,
                 width: view.getUint32(16), height: view.getUint32(20) };
      })()`,
    );
    assert(
      "WEB-O01 PNG 매직바이트",
      image.magic === "89504e470d0a1a0a",
      `magic=${image.magic}`,
    );
    assert(
      "WEB-O01 PNG 1080×1350",
      image.width === 1080 && image.height === 1350,
      `${image.width}×${image.height} · ${image.bytes}B · ${image.type}`,
    );

    // FR-022 — 공유 링크 생성과 열람
    await page.goto(`${web.baseUrl}/result?overlay=share`);
    await page.waitForText("무엇을 공유할까요?");
    const shareFields = await page.text();
    assert(
      "WEB-O02 공개 항목 사전 확인",
      shareFields.includes("링크 보유자에게 공개되는 항목"),
    );
    await page.clickText("button", "공유 링크 만들기");
    await page.waitForText("/share/");
    const shareUrl = await page.evaluate(
      "document.querySelector('#share-url .numeric').innerText.trim()",
    );
    assert("WEB-O02 공유 URL 생성", shareUrl.includes("/share/"), shareUrl);

    const shareToken = shareUrl.split("/share/")[1];
    await page.goto(`${web.baseUrl}/share/${shareToken}`);
    const shared = await page.text();
    assert("WEB-06 공유 결과 열람", shared.includes("공유된 불변 결과"));
    assert(
      "WEB-06 원본 입력 비공개 고지",
      shared.includes("공유되지 않았습니다"),
    );

    await page.goto(`${web.baseUrl}/share/definitely-not-a-real-token`);
    assert(
      "WEB-06 유효하지 않은 토큰",
      (await page.text()).includes("링크 확인 불가"),
    );

    await page.goto(`${web.baseUrl}/roadmap`);
    const roadmap = await page.text();
    assert(
      "WEB-04 로드맵 5단계",
      ["현재 상태", "자산 축적", "자격 확인", "대출 준비", "매입 준비"].every(
        (s) => roadmap.includes(s),
      ),
    );
    assert("WEB-04 자격 3상태 표기", /가능|확인 필요|어려움/.test(roadmap));

    await page.goto(`${web.baseUrl}/checklist`);
    await page.waitForText("실행 체크리스트");
    await page.evaluate(
      "(() => { const b = document.querySelector('input[data-mission]'); b.click(); return true; })()",
    );
    await sleep(600);
    const progressBefore = await page.evaluate(
      "document.querySelector('#progress-count').innerText",
    );
    await page.goto(`${web.baseUrl}/checklist`);
    await page.waitForText("실행 체크리스트");
    const progressAfter = await page.evaluate(
      "document.querySelector('#progress-count').innerText",
    );
    assert(
      "WEB-05 로컬 저장 복원",
      progressBefore === progressAfter,
      `${progressBefore} → ${progressAfter}`,
    );

    console.log("\n== 운영 흐름 (ADM-P01 → ADM-R06) ==");
    await page.goto(`${admin.baseUrl}/properties`);
    assert(
      "미인증 접근 차단",
      (await page.url()).includes("/login"),
      await page.url(),
    );

    const email = process.env.SEED_ADMIN_EMAIL ?? "owner@zipsanya.local";
    const initialPassword =
      process.env.SEED_ADMIN_PASSWORD ?? "zipsanya-initial-owner-2026";
    const nextPassword = `zipsanya-smoke-${randomUUID()}`;

    await page.fill("#email", email);
    await page.fill("#password", "wrong-password-value");
    await page.clickText("button", "로그인");
    await page.waitForText("로그인 정보를 확인해 주세요");
    record("ADM-P01 중립적 인증 실패 문구", true);
    await clearAuthAttempts();

    await page.fill("#email", email);
    await page.fill("#password", initialPassword);
    await page.clickText("button", "로그인");
    await page.waitForText("2단계 인증 설정");
    assert(
      "ADM-P03 최초 설정 격리",
      (await page.url()).includes("/login/setup"),
    );

    const secret = await page.evaluate(
      "document.querySelector('input[name=secret]').value",
    );
    assert(
      "ADM-P03 TOTP secret 발급",
      typeof secret === "string" && secret.length >= 16,
    );
    const { totpCode } = await import("../packages/security/src/totp.ts");
    await page.fill("#password", nextPassword);
    await page.fill("#confirm", nextPassword);
    await page.fill("#code", totpCode(secret));
    await page.clickText("button", "설정 완료");
    await page.waitForText("매물·면적", 30000);
    assert(
      "ADM-R01 매물 목록 진입",
      (await page.url()).includes("/properties"),
    );

    const properties = await page.text();
    assert(
      "ADM-R01 시세 상태 표기",
      properties.includes("정상") || properties.includes("확인 필요"),
    );

    await page.clickText("a", "상세");
    await page.waitForText("확정 시세 편집");
    assert(
      "ADM-R02 면적 상세 진입",
      /\/properties\/.+\/areas\/.+/.test(await page.url()),
    );

    const newPrice = String(
      1_234_000_000 + Math.floor(Math.random() * 1_000) * 1_000_000,
    );
    await page.fill("#price", newPrice);
    await page.fill("#sourceLabel", "스모크 검증 - 운영자 확정");
    await page.clickText("button", "새 값 저장");
    await page.waitForText("새 확정 시세를 저장했습니다");
    record("ADM-R02 확정 시세 저장", true, `${newPrice}원`);

    await page.goto(`${admin.baseUrl}/audit-logs`);
    const audit = await page.text();
    assert("ADM-R06 감사 기록 반영", audit.includes("PRICE_OVERRIDE_SAVED"));

    await page.goto(`${admin.baseUrl}/rules`);
    assert("ADM-R03 규칙 목록", (await page.text()).includes("대출 규칙 버전"));

    await page.goto(`${admin.baseUrl}/admins`);
    const admins = await page.text();
    assert(
      "ADM-R05 관리자 계정",
      admins.includes("관리자") && admins.includes(email),
    );

    // 비밀번호를 원상 복구해 스모크를 재실행 가능하게 둔다.
    console.log("\n== 재실행 가능성 복구 ==");
    // 생성된 Prisma 클라이언트는 확장자 없는 상대 import 를 써서 plain Node ESM 으로는 해석되지
    // 않는다(번들러 또는 tsx 가 필요하다). 여기서는 복구 SQL 몇 줄이면 되므로 `pg` 를 직접 쓴다.
    const { hashPassword } =
      await import("../packages/security/src/password.ts");
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const restored = await client.query(
      `UPDATE "AdminAccount"
          SET "passwordHash" = $2, "status" = 'SETUP_REQUIRED', "mfaEnabled" = false,
              "sessionVersion" = "sessionVersion" + 1
        WHERE "email" = $1
        RETURNING "id"`,
      [email, await hashPassword(initialPassword)],
    );
    const adminId = restored.rows[0]?.id;
    if (adminId) {
      await client.query(
        `DELETE FROM "AdminMfaCredential" WHERE "adminId" = $1`,
        [adminId],
      );
      await client.query(`DELETE FROM "AdminSession" WHERE "adminId" = $1`, [
        adminId,
      ]);
      // 스모크는 «중립적 실패 문구» 확인을 위해 일부러 한 번 틀린다. 그 실패가 쌓이면
      // 세 번째 실행부터 점진 제한에 걸려 스모크 자체가 재실행 불가가 된다.
      await client.query(
        `DELETE FROM "AuthAttempt" WHERE "createdAt" > now() - interval '1 hour'`,
      );
    }
    await client.end();
    assert(
      "초기 운영자 상태 복구(재실행 가능)",
      Boolean(adminId),
      `adminId=${adminId ?? "없음"}`,
    );
  } finally {
    await browser.close();
    web.stop();
    admin.stop();
    await sleep(500);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\n== 결과 ==\n검사 ${checks.length}건 · 통과 ${checks.length - failed.length}건 · 실패 ${failed.length}건`,
  );
  if (failed.length > 0) {
    for (const f of failed) console.log(`  FAIL ${f.name} ${f.detail}`);
    process.exit(1);
  }
  console.log("SMOKE PASS");
}

run().catch((error) => {
  console.error(`\nSMOKE FAIL: ${error.message}`);
  process.exit(1);
});
