BADGE Mobile/Desktop/디자인 동일
설명: 콘텐츠 준비 동안 예상 배치를 유지하는 자리 표시자. 텍스트·사각형·원형.
import { Skeleton } from "@BG002501-KT-Com/kt-ux-design/loading"

## Skeleton  (HTMLAttributes<HTMLDivElement>, ref)
type → text | rectangle | circle ⟨text⟩
width → string | number ⟨타입별 기본값⟩ 숫자는 px
height → string | number ⟨타입별 기본값⟩ 숫자는 px
theme → Theme ⟨전역 테마⟩
기본 치수: text 200×24, rectangle 200×200, circle 200×200. 문자열은 %, rem, calc() 허용. aria-busy="true" + aria-live="polite" 제공.
skeletonVariants / SkeletonVariants export.

Examples: Default / Variants(본문, 상품 이미지, 프로필)
Figma: (없음)
