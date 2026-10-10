BADGE Mobile/Desktop
설명: 대화 목록·프로젝트 탐색 navigation surface. Desktop/Mobile root 각각 선택, header·contents·list·footer compound child 조합.
import { SidebarDesktop, SidebarDesktopContents, SidebarDesktopFooter, SidebarDesktopHeader, SidebarDesktopList, SidebarItemDesktop, SidebarLogo } from "@BG002501-KT-Com/kt-ux-design/sidebar"

## Root and compound children  (Root: HTMLAttributes<HTMLDivElement>)
SidebarDesktop, SidebarMobile → open, onOpenChange, theme, children
SidebarDesktopHeader/Contents/List/Footer, SidebarMobileHeader/Contents/List/Footer → children, List의 subtitle, subtitleState
SidebarItem → label, itemType(action | conversation | project | more), selected, state, onClick ⟨itemType="action"⟩
SidebarItemDesktop/Mobile → label, itemType, selected
SidebarLogo → logo, collapsedLogo, tag, collapsed
SidebarSubtitle → text, state: default | expanded | collapsed | reorder ⟨default⟩
SidebarBottom → type, userName, userInitial, memoryText ⟨프로필·메모리 footer⟩
SidebarListConversationMobile → type: conversation | skeleton | noData, children ⟨conversation⟩
SidebarPanelIconButton → icon, aria-label(필수), selected, expanded
SidebarSurfaceContext·useSidebarSurface. Mobile root는 onOpenChange 연결로 ESC·overlay 보존.

Examples: Default / Variants(Desktop surface, Mobile surface) / States(Default·Selected·Hover) / Subcomponents(Panel controls, Conversation list, list states, Item and bottom) / Interaction
Figma: (없음)
