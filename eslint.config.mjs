import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

export default [
  // 1. Global ignores
  {
    ignores: [
      "**/node_modules/",
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
    files: [
      "apps/web/**/*.{ts,tsx,js,jsx}",
      "apps/admin/**/*.{ts,tsx,js,jsx}",
    ],
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
          Object.entries(next.plugins).filter(([name]) => name !== "@next/next"),
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
