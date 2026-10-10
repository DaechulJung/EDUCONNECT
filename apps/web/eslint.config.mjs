import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // KDS 키트 CSS는 app/layout.tsx에서 public/kds 정적 파일로 불러온다(import하면 글꼴이 빠진 클론에서 빌드가 실패한다).
    files: ["app/layout.tsx"],
    rules: { "@next/next/no-css-tags": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated from the API schema by `npm run gen:api`.
    "lib/client/**",
  ]),
]);

export default eslintConfig;
