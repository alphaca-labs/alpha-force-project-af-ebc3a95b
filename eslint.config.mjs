import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default [
  // 1. Global ignores
  {
    ignores: [
      "**/node_modules/",
      // 산출물 경계 — 이 저장소의 워크트리 루트가 곧 프로젝트 루트라 `outputs/**` 가
      // 루트 글롭 안에 들어온다. Alpha Force 실행 산출물·인계 데이터는 제품 소스가
      // 아니므로 루트 `eslint .` 대상에서 제외한다. ESLint 9 flat config 는
      // `.eslintignore` 도 `.gitignore` 도 읽지 않으므로 반드시 여기에 적어야 한다.
      "outputs/",
      ".alpha-force/",
      "**/.next/",
      "**/.turbo/",
      "**/dist/",
      "**/build/",
      "**/coverage/",
      "**/generated/",
      "**/.react-router/",
      "**/storybook-static/",
      "**/.react-email/",
      "packages/design-system/components/ui/",
      "packages/design-system/lib/",
      "packages/design-system/hooks/",
    ],
  },

  // 2. Base JS recommended
  js.configs.recommended,

  // 3. TypeScript recommended (NOT type-checked)
  ...tseslint.configs.recommended,

  // 4. Next.js config for Next.js app directories only (web, admin).
  //    apps/api is a Fastify app (no React/Next) — intentionally excluded so it
  //    falls back to the base JS + typescript-eslint rules above.
  ...nextCoreWebVitals.map((config) => ({
    ...config,
    files: ["apps/web/**/*.{ts,tsx,js,jsx}", "apps/admin/**/*.{ts,tsx,js,jsx}"],
  })),

  // 4a. Fastify app (apps/api) runs on Node. It gets the base JS +
  //     typescript-eslint rules above (no React/Next). Provide Node globals so
  //     Node/TS source doesn't trip `no-undef`.
  //     Globals declared inline to avoid adding the `globals` dependency.
  {
    files: ["apps/api/**/*.{ts,tsx,js,jsx,cjs,mjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        module: "writable",
        require: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
      },
    },
  },

  // 4a-iii. Node ESM scripts under scripts/**. Globals declared inline to
  //         avoid adding the `globals` dependency.
  //         Node 18+ 는 fetch/WebSocket/Response/AbortController 를 전역으로 제공한다 —
  //         빠뜨리면 스모크 스크립트가 통째로 `no-undef` 로 걸린다.
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        global: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        WebSocket: "readonly",
        AbortController: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
      },
    },
  },

  // 4b. React-aware config for apps/frontend (React Router v7 + React 19).
  //     Reuses the React/react-hooks/jsx-a11y/import rules that
  //     eslint-config-next already bundles, but strips the Next-specific
  //     `@next/next` plugin and rules (RR7 is not a Next.js app).
  //     No new dependency is introduced.
  ...nextCoreWebVitals
    .filter((config) => {
      const plugins = config.plugins ? Object.keys(config.plugins) : [];
      const rules = config.rules ? Object.keys(config.rules) : [];
      // Drop blocks that ONLY contribute @next/next plugin/rules.
      const onlyNext =
        plugins.length > 0 &&
        plugins.every((p) => p === "@next/next") &&
        rules.every((r) => r.startsWith("@next/"));
      return !onlyNext;
    })
    .map((config) => {
      const next = { ...config, files: ["apps/frontend/**/*.{ts,tsx,js,jsx}"] };
      if (next.plugins && "@next/next" in next.plugins) {
        next.plugins = Object.fromEntries(
          Object.entries(next.plugins).filter(
            ([name]) => name !== "@next/next",
          ),
        );
      }
      if (next.rules) {
        next.rules = Object.fromEntries(
          Object.entries(next.rules).filter(([r]) => !r.startsWith("@next/")),
        );
      }
      return next;
    }),

  // 5. Relax rules for config files
  {
    files: ["**/*.config.{js,mjs,cjs,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // 6. Relax rules globally (minimum viable lint)
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },

  // 7. Relax React-scoped rules (Next.js apps + RR7 frontend)
  {
    files: [
      "apps/web/**/*.{ts,tsx,js,jsx}",
      "apps/admin/**/*.{ts,tsx,js,jsx}",
      "apps/frontend/**/*.{ts,tsx,js,jsx}",
    ],
    rules: {
      "react/display-name": "warn",
    },
  },

  // 8. Prettier must be last
  eslintConfigPrettier,
];
