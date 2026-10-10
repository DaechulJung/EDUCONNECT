BADGE Mobile/Desktop
설명: 본문 옆에 출처·문서 미리보기·텍스트 편집기 등 부가 정보 패널. Desktop·Mobile 별도 public component, ContextPanelRoot로 열림 상태 공유.
import { ContextPanelReferenceDesktop } from "@BG002501-KT-Com/kt-ux-design/context-panel"

## Panel families  (HTMLAttributes<HTMLDivElement>)
ContextPanelReferenceDesktop/Mobile → title, items, open, onOpenChange, onClose ⟨title="출처", Desktop open true⟩ 출처 목록
ContextPanelTextEditorDesktop → open, width, resizable, children ⟨open=true, resizable=true⟩
ContextPanelTextEditorMobile → title, open, onClose, children ⟨선택⟩
ContextPanelPDFViewerDesktop/Mobile → title, pages, currentPage, onPageChange, zoom events ⟨currentPage=0⟩
ContextPanelRoot → defaultOpen, open, onOpenChange, children ⟨false⟩ 열림 상태 provider

## Shared controls
ContextPanelIconButton → icon + 필수 aria-label
ContextPanelPageButton → direction: left | right
ContextPanelPageThumbnail → active, src, alt
ContextPanelInputText → text, type: textOnly | overflow | overflowExpanded
ContextPanelTextEditorDesktopContent / MobileContent → 내부 콘텐츠 slot
ContextPanelEditorFAB · ContextPanelEditorFABSlider → 편집 액션·값 조절
ContextPanelTextEditorHeader · ContextPanelTextEditorFAB → 편집기 header/action
variant helper는 저수준 export (별도 Canvas 없음). 제어형(open+onOpenChange) 권장.

Examples: Default / Variants(Desktop·Mobile 출처, Desktop·Mobile PDF) / States(Icon button, Page buttons, Input text overflow) / Subcomponents(Page controls, Editor header, Editor actions) / Interaction / Responsive
Figma: (없음)
