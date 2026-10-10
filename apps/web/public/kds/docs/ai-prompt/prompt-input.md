BADGE Mobile/Desktop
설명: 사용자가 작성한 프롬프트를 대화 화면에 표시하는 family. 독백형·말풍선형 + 첨부 파일·탭 조합.
import { PromptInput, PromptInputMonologue } from "@BG002501-KT-Com/kt-ux-design/prompt-input"

## PromptInput  (HTMLAttributes<HTMLDivElement>)
type → monologue ⟨monologue⟩
surface → mobile | desktop ⟨상위 surface⟩
children → ReactNode ⟨필수⟩ PromptInputMonologue 또는 PromptInputBubble
theme → light | light-agent | dark | dark-agent ⟨전역 테마⟩

## Public children and helpers (산문 형식)
PromptInputMonologue / PromptInputBubble → children, defaultExpanded, editable, onSubmit, copied, onCopy, showActionBar, theme
PromptInputSetMonologue / PromptInputSetBubble → type, children ⟨첨부 조합⟩
PromptInputSetTabGroup → value, defaultValue, onValueChange, children
PromptInputSetTabContent → name, value, children
PromptInputFileArea → children
PromptInputAttachedFile → type, fileName, imageSrc, fileType
PromptInputSetBubbleImage → src, alt
PromptInputSheet → open, onOpenChange, defaultValue, onSave
PromptSurfaceProvider / PromptSurfaceContext / usePromptSurface, PromptInputSetTabContext / usePromptInputSetTabContext.

Examples: Default / Variants(Desktop Monologue, Mobile Bubble, 이미지 첨부, 파일 첨부) / States(Read only Collapsed/Expanded, Editable × Monologue/Bubble) / Attachments(Tabbed, Multiple files) / Subcomponents(Disclosure, Action bar, Attached files) / Interaction
Figma: (없음)
