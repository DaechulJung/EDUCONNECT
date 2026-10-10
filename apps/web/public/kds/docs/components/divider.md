BADGE Mobile/Desktop/반응형
설명: 목록 항목·섹션 사이 시각적 경계. 얇은 inset 선 + 넓은 full-width 면. density·padding props로 여백 조절.
import { Divider } from "@BG002501-KT-Com/kt-ux-design/divider"

## Divider  (HTMLAttributes<HTMLDivElement>, ref 지원)
type → inset | full-width ⟨inset⟩ inset=좌우 기본 여백 1px 선, full-width=여백 없는 8px 면
density → default | compact ⟨default⟩ default=위아래 20px, compact=세로 여백 없음
paddingTop, paddingBottom → number  루트 위아래 여백 px override
paddingLeft, paddingRight → number ⟨type 기본값⟩ 선 좌우 여백 px override
noGutter → boolean ⟨false⟩ 좌우 여백 제거
theme → Theme ⟨전역 테마⟩
dividerVariants, DividerVariants export.

Examples: Default / Variants(Inset·Default, Inset·Compact, Full width·Default, Full width·Compact)
Figma: (없음)
