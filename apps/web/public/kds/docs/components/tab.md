BADGE Mobile/Desktop/반응형
설명: 한 화면의 관련 콘텐츠를 같은 계층에서 전환. Tabs가 선택 상태 소유, List/Trigger/Content를 같은 value로 연결.
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@BG002501-KT-Com/kt-ux-design/tab"

## Tabs  (HTMLAttributes<HTMLDivElement>, native onChange 제외)
value → string  제어 모드
defaultValue → string ⟨""⟩
onValueChange → (value: string) => void
type → fixed | scrollable ⟨fixed⟩ 균등 배치 / 가로 스크롤
disabled → boolean ⟨false⟩ 모든 Trigger 비활성
children → ReactNode ⟨필수⟩
ref → Ref<HTMLDivElement>

## TabsList  (HTMLAttributes<HTMLDivElement>) role="tablist". type="scrollable"이면 가로 스크롤 + 끝단 그라디언트.

## TabsTrigger  (ButtonHTMLAttributes, native value·type 제외)
value → string ⟨필수⟩
children → ReactNode ⟨필수⟩
icon → ReactNode  레이블 뒤 장식 아이콘
disabled → boolean ⟨false⟩
ref → Ref<HTMLButtonElement>
클릭 + Left/Right/Home/End 키 이동, aria-selected/aria-controls 관리. scrollable 문자열 레이블은 선택 전후 동일 폭.

## TabsContent  (HTMLAttributes<HTMLDivElement>) 필수 value, 선택된 panel만 표시. children, ref.

Examples: Default / Variants(fixed 3탭, scrollable 6탭) / States(disabled 탭, 전체 disabled) / Interaction
Figma: (없음)
