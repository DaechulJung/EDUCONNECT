BADGE Mobile/Desktop/디자인 동일
설명: 설정처럼 즉시 적용되는 두 상태 on/off. 제출 시점 확정 항목은 checkbox/radio.
import { Switch } from "@BG002501-KT-Com/kt-ux-design/switch"

## Switch  (ButtonHTMLAttributes<HTMLButtonElement>)
size → xsmall | small | medium ⟨medium⟩
checked → boolean ⟨undefined⟩ 제어
defaultChecked → boolean ⟨false⟩
onCheckedChange → (checked: boolean) => void
isText → boolean ⟨false⟩ medium에서 ON/OFF 텍스트
disabled → boolean ⟨false⟩
name / value → string  form 전달
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLButtonElement>
accessible name 필수 (label 없으면 aria-label). switchVariants / SwitchVariants export.

Examples: Default / Variants(선택 안 함, 선택, ON/OFF 텍스트) / States(비활성, 텍스트·비활성, 다크 테마) / Interaction
Figma: (없음)
