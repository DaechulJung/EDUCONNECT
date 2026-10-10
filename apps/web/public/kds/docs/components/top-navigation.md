BADGE Mobile
설명: 현재 위치 안내 + 메뉴·이전·검색 등 중요 액션을 최상단 배치. 제목/서비스 로고 중심 좌우 영역 조합. 스크롤 화면은 scrolling="on"으로 그림자.
import { TopNavigation, TopNavigationCenter, TopNavigationIconButton, TopNavigationLeft, TopNavigationLogo, TopNavigationRight } from "@BG002501-KT-Com/kt-ux-design/top-navigation"

## TopNavigation  (Omit<HTMLAttributes<HTMLDivElement>, "title">)
type → logo | menu | sub | sub-button | depth | full-popup | search ⟨logo⟩
align → center | left ⟨center⟩
scrolling → off | on ⟨off⟩ 상단 그림자
theme → light | light-agent | dark | dark-agent ⟨전역 테마⟩
children → ReactNode
className → string
ref → Ref<HTMLDivElement>

## Composition
TopNavigationLeft → HTMLAttributes<HTMLDivElement>, children, ref ⟨선행 액션⟩
TopNavigationCenter → … ⟨좌우 액션 수와 무관하게 중앙 유지⟩
TopNavigationRight → … ⟨후행 액션⟩
TopNavigationTitle → … ⟨말줄임 지원 제목⟩
TopNavigationLogo → ButtonHTMLAttributes, logo, align, children, ref ⟨logo: kt | kt-m-mobile | kt-membership | y-box | k-intelligence | family-box | myk, custom은 children⟩
TopNavigationIconButton → ButtonHTMLAttributes, icon, ref ⟨aria-label 필수⟩
topNavigationVariants({type, align, scrolling}) / TopNavigationVariants export.

Examples: Default / Variants(Logo, Menu, Sub, Sub Button, Depth, Full Popup, Search) / Alignments(Centered, Left+leading, Left without leading) / States(Default, Scrolling, Long title) / Logos 7종 / Interaction
Figma: Top Navigation Type / Spec
