BADGE Mobile/Desktop/반응형
설명: 키워드 입력·검색 실행. 테두리 outline / 하단 선 underline.
import { Search } from "@BG002501-KT-Com/kt-ux-design/search"

## Search  (InputHTMLAttributes<HTMLInputElement>)
type → outline | underline ⟨outline⟩
value → string ⟨undefined⟩ 제어 모드
state → default | focused | typing | complete | disabled ⟨default⟩ 실제 focus/값/disabled 우선
hasBackButton → boolean ⟨false⟩
placeholder → string ⟨"메뉴를 검색해 보세요"⟩
showClearButton → boolean ⟨true⟩ focus + 값 있을 때 삭제 버튼
containerClassName → string
theme → Theme ⟨전역 테마⟩
onChange → (value: string) => void
onSearch → (value: string) => void  Enter/검색 버튼
onBack / onClear → () => void
ref → Ref<HTMLInputElement>
searchFieldVariants / SearchVariants export.

Examples: Default / Variants(Outline, Outline·뒤로가기, Underline, Underline·뒤로가기) / States(입력 완료, 비활성 × 2 타입) / Interaction
Figma: (없음)
