BADGE Mobile/Desktop
설명: AI 응답 생성 중 처리 상태·추론 과정 전달 family. 단순 상태=ProcessIndicatorProcessing, 접고 펼치는 추론=reasoning 조합 또는 dropdown.
import { ProcessIndicatorProcessing } from "@BG002501-KT-Com/kt-ux-design/process-indicator"

## ProcessIndicatorProcessing  (HTMLAttributes<HTMLDivElement>)
state → processing | generating | complete | canceled | error ⟨processing⟩
text → string ⟨필수⟩
errorIcon → ReactNode ⟨기본 아이콘⟩

## Reasoning composition (산문 형식)
ProcessIndicatorReasoning > ProcessIndicatorReasoningHeader + ProcessIndicatorReasoningBody
Header → status: loading | output, text 또는 titleContent. output title은 ProcessIndicatorReasoningHeaderTitle(type: textOnly | dropdown | dropdownOverflow, expanded, onToggle)
Body → type: text | search, status: loading | output, text 또는 ProcessIndicatorReasoningBodyTag children
BodyTag → label, overflow: on | off

## Dropdown
ProcessIndicatorDropdown → label, defaultExpanded, reasoningTexts ⟨자체 disclosure⟩
ProcessIndicatorToggle → expanded, onClick ⟨공개 버튼⟩
PromptSurfaceProvider(mobile·desktop surface), PromptSurfaceContext·usePromptSurface.

Examples: Default / States(Processing·Generating·Complete·Canceled·Error) / Subcomponents(Reasoning header, Reasoning body, Toggle) / Interaction
접근성: role="status", 토글 버튼에 열림 상태 반영.
Figma: (없음)
