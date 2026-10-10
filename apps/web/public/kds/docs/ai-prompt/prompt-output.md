BADGE Mobile/Desktop
설명: AI 응답을 Markdown·코드·출처·추천 질문·피드백 조합으로 표시하는 family. 콘텐츠 구조=Markdown 컴포넌트, 사용자 동작=인터랙션 컴포넌트.
import { PromptOutputMarkdownBody } from "@BG002501-KT-Com/kt-ux-design/prompt-output"

## Markdown (각 컴포넌트는 해당 HTML 요소 표준 attribute 확장)
PromptOutputMarkdownHeading → level: 1|2|3|4|5|6, children ⟨2⟩
PromptOutputMarkdownBody → children ⟨필수⟩ 본문 + 강조 키워드(data-slot="prompt-output-markdown-body-keyword")
PromptOutputMarkdownList → children ⟨필수⟩
PromptOutputMarkdownListItem → type: ordered | unordered, level, marker ⟨unordered⟩
PromptOutputMarkdownBlockquote → children, blockquote attributes ⟨children 필수⟩
PromptOutputMarkdownInlineCode → children, code attributes ⟨children 필수⟩
PromptOutputMarkdownLink → href, size, disabled ⟨medium⟩
PromptOutputMarkdownTable → children ⟨필수⟩
PromptOutputMarkdownAttachedDocument → fileName, fileExtension, fileSize, onDownload ⟨fileName 필수⟩

## Code and references
PromptOutputCodeBlock → language, children
PromptOutputCopyButton → copyText, onCopySuccess
PromptOutputCitation → number, button attributes
PromptOutputSource → label, favicons

## Suggestions and feedback (산문)
PromptOutputSuggestion(type: vertical | horizontal, size: small | large) > PromptOutputSuggestionPrompt
PromptOutputFeedbackButton → type: copy | like | dislike | share | edit | more, size: small | large
PromptOutputFeedbackButtonGroup → layout child
PromptSurfaceProvider(mobile | desktop), PromptSurfaceContext·usePromptSurface.

Examples: Default / Variants(Blockquote, Link+Inline code, Table+Document) / Actions(Code copy, Citation·Source, Feedback) / Interaction(Suggestion Vertical/Small)
Figma: (없음)
