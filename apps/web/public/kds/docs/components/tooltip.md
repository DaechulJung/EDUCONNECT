BADGE Mobile/Desktop/디자인 동일
설명: 화면 요소를 가리지 않는 짧은 보충 정보. trigger 조합 composition API 기본, 정적 표면만 TooltipStandalone.
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@BG002501-KT-Com/kt-ux-design/tooltip"

## Composition
TooltipProvider → Radix Provider props ⟨auto tooltip 지연 시간·provider 범위⟩
Tooltip → type?: auto | toggle, open, defaultOpen, onOpenChange, onClose ⟨root. auto=3초 후 닫힘, toggle=명시적 닫기⟩
TooltipTrigger → Radix Trigger props
TooltipContent → 아래

## TooltipContent
children → ReactNode ⟨필수⟩
side → top | right | bottom | left ⟨top⟩
align → start | center | end ⟨center⟩
sideOffset / alignOffset → number ⟨0⟩
avoidCollisions → boolean ⟨true⟩
collisionPadding → number ⟨8⟩
portal → boolean ⟨true⟩
forceMount → true ⟨undefined⟩
container → Element | null
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLDivElement>

## TooltipStandalone  (HTMLAttributes<HTMLDivElement>)
children → ReactNode ⟨필수⟩
type → auto | toggle ⟨auto⟩ toggle은 닫기 버튼
position → top|bottom|left|right × 3 정렬 ⟨top-center⟩ caret 변과 정렬
visible → boolean ⟨true⟩
onClose → () => void
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLDivElement>
tooltipVariants, TooltipVariants, TooltipType, TooltipSide, TooltipAlign export.

Examples: Default / Variants(Auto 4방향, Toggle 4방향, 다크 테마) / Interaction
Figma: Tooltip Type Cases
