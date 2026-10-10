import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "App",
  description: "해커톤 공통 뼈대",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" data-brand="aidx">
      <head>
        {/* KDS 2.0 + AID-X 브랜드 레이어 (public/kds, 순서 그대로). import하지 않고 정적 파일로 불러온다:
            KT Flow 글꼴이 .gitignore로 빠진 저장소(CI·클론)도 빌드되고, 글꼴만 기본 글꼴로 대신 보인다 */}
        <link rel="stylesheet" href="/kds/tokens/kds-tokens.css" />
        <link rel="stylesheet" href="/kds/tokens/kds-base.css" />
        <link rel="stylesheet" href="/kds/tokens/kds-components.css" />
        <link rel="stylesheet" href="/kds/extras/aidx-brand.css" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
