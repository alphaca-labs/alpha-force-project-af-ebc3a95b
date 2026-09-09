import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME =
  process.env.CHROME_BIN ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** OS 가 배정한 가용 포트를 받는다. 고정 포트를 신뢰하지 않는다. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * 최소 CDP 드라이버. 외부 의존성 없이 Node 전역 `WebSocket` 만 쓴다.
 *
 * 조작할 target 은 `/json/activate` 로 반드시 활성화한다 — 비활성 탭의 렌더러에는
 * 합성 입력이 전달되지 않아 «앱이 무반응» 처럼 보이는 오탐이 난다.
 */
export async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), "zipsanya-smoke-profile-"));
  const port = await freePort();
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--window-size=1440,1000",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let target = null;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const list = await (
        await fetch(`http://127.0.0.1:${port}/json/list`)
      ).json();
      target = list.find((t) => t.type === "page");
      if (target) break;
    } catch {
      /* 아직 준비 전 */
    }
    await sleep(200);
  }
  if (!target) throw new Error("Chrome CDP 연결에 실패했습니다.");

  await fetch(`http://127.0.0.1:${port}/json/activate/${target.id}`);
  const page = await connect(target.webSocketDebuggerUrl);

  return {
    page,
    chromePid: child.pid,
    async close() {
      page.close();
      child.kill("SIGTERM");
      await sleep(300);
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {
        /* 정리 실패는 검증 결과를 바꾸지 않는다 */
      }
    },
  };
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const resolver = pending.get(message.id);
    if (!resolver) return;
    pending.delete(message.id);
    if (message.error) resolver.reject(new Error(message.error.message));
    else resolver.resolve(message.result);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  const api = {
    send,
    close: () => socket.close(),

    async evaluate(expression) {
      const result = await send("Runtime.evaluate", {
        expression: `(async () => { return (${expression}); })()`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(
          result.exceptionDetails.exception?.description ?? "평가 실패",
        );
      }
      return result.result.value;
    },

    async goto(target) {
      await send("Page.navigate", { url: target });
      for (let attempt = 0; attempt < 200; attempt += 1) {
        try {
          const ready = await api.evaluate("document.readyState");
          if (ready === "complete") {
            // 하이드레이션이 끝나 이벤트 핸들러가 붙을 시간을 짧게 준다.
            await sleep(400);
            return;
          }
        } catch {
          /* 내비게이션 중 컨텍스트 교체 */
        }
        await sleep(100);
      }
      throw new Error(`페이지 로드 시간 초과: ${target}`);
    },

    text: () => api.evaluate("document.body.innerText"),
    url: () => api.evaluate("location.href"),

    async clickText(selector, text) {
      const clicked = await api.evaluate(
        `(() => {
          const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
          const node = nodes.find((n) => ((n.innerText || n.value || "") + "").includes(${JSON.stringify(text)}));
          if (!node) return false;
          node.scrollIntoView({ block: "center" });
          node.click();
          return true;
        })()`,
      );
      if (!clicked)
        throw new Error(`«${text}» 를 가진 ${selector} 를 찾지 못했습니다.`);
      await sleep(1000);
    },

    async click(selector) {
      const clicked = await api.evaluate(
        `(() => {
          const node = document.querySelector(${JSON.stringify(selector)});
          if (!node) return false;
          node.scrollIntoView({ block: "center" });
          node.click();
          return true;
        })()`,
      );
      if (!clicked) throw new Error(`클릭 대상을 찾지 못했습니다: ${selector}`);
      await sleep(800);
    },

    async fill(selector, value) {
      const ok = await api.evaluate(
        `(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return false;
          const proto = el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : el instanceof HTMLSelectElement
              ? HTMLSelectElement.prototype
              : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(String(value))});
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        })()`,
      );
      if (!ok) throw new Error(`입력 대상을 찾지 못했습니다: ${selector}`);
    },

    async waitForText(text, timeoutMs = 20000) {
      const deadline = Date.now() + timeoutMs;
      let last = "";
      while (Date.now() < deadline) {
        try {
          last = await api.text();
          if (last.includes(text)) return true;
        } catch {
          /* 내비게이션 중 */
        }
        await sleep(250);
      }
      throw new Error(
        `«${text}» 가 화면에 나타나지 않았습니다. 현재 본문 앞부분: ${last.slice(0, 300)}`,
      );
    },
  };

  return api;
}
