import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

/**
 * F4.2 — repaired ESLint flat config.
 *
 * The previous config had no TypeScript parser, no globals, and linted the
 * committed serverless bundle, so `npx eslint .` failed with ~109 errors and
 * the `lint` script never invoked ESLint at all.
 *
 * Layout:
 * - Build outputs / generated code are ignored (api/ holds the committed
 *   esbuild bundle `api/_server.js`; never lint generated code).
 * - `src/` is browser code (window/document globals).
 * - `server.ts`, `security-entry.ts`, config files, scripts/ and e2e/ run in
 *   Node — they get Node globals and `no-console` off (server-side logging is
 *   intentional: boot fail-fast checks, request logging, probes).
 * - Firestore rules files keep the @firebase security-rules plugin.
 */
export default tseslint.config(
  {
    ignores: [
      "api/",
      "dist/",
      "scripts/archive/",
      "coverage/",
      "playwright-report/",
      "test-results/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...(Array.isArray(firebaseRulesPlugin.configs["flat/recommended"])
    ? firebaseRulesPlugin.configs["flat/recommended"]
    : [firebaseRulesPlugin.configs["flat/recommended"]]),
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: [
      "server.ts",
      "security-entry.ts",
      "vite.config.ts",
      "playwright.config.ts",
      "scripts/**/*.{ts,tsx,js,mjs}",
      "e2e/**/*.{ts,tsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser, // e2e specs evaluate code in the browser context
      },
    },
    rules: {
      // Server-side and tooling code logs to stdout/stderr on purpose
      // (fail-fast boot checks, request logging, probes). Client logging is
      // Firestore-backed (see F4.7) — console is deliberately avoided there.
      "no-console": "off",
    },
  },
  {
    rules: {
      // Net-noise until F4.6 (zod contracts) + F5.3 (strict TS) land: 150+
      // pre-existing `any`s, each flagged here would drown real signals.
      // Re-enable when strict mode is turned on.
      "@typescript-eslint/no-explicit-any": "off",
      // Unused catch bindings are noise: bare `catch {}` is idiomatic since
      // ES2019 and error details are already logged inside most handlers.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { caughtErrors: "none" },
      ],
    },
  },
);
