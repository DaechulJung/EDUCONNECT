BADGE Mobile/Desktop/반응형
설명: 화면 위에 떠서 주요 작업·자주 쓰는 메뉴에 계속 접근하게 하는 버튼. 아이콘 전용 FAB, 아이콘+텍스트 Extended FAB, 흰 배경 Inverse.
import { FloatingActionButton } from "@BG002501-KT-Com/kt-ux-design/floating-action-button"

## FloatingActionButton  (ButtonHTMLAttributes<HTMLButtonElement>, ref 지원, theme 지원)
variant → fab | extended | inverse ⟨fab⟩ 시각적 타입
children → ReactNode  아이콘 또는 아이콘+레이블. 아이콘 전용일 때 aria-label 필수

## FloatingActionButtonMenu  (data-theme 상속, 색상 토큰 직접 소비 안 함)
open → boolean ⟨false⟩ 메뉴 아이템 표시 여부
closeIcon → ReactNode  메뉴 닫는 FAB 아이콘
onClose → () => void
children → ReactNode  FloatingActionButtonMenuItem 세로 배치

## FloatingActionButtonMenuItem  (theme 지원)
label → string
icon → ReactNode
onClick → () => void
세 컴포넌트 모두 className, 표준 DOM props, ref 지원.

Examples: Default / Variants(FAB, Extended FAB "상담하기", Inverse) / Responsive / Interaction(메뉴: 메시지·설정)
Figma: (없음)
