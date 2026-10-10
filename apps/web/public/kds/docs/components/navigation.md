BADGE Desktop/PC 전용  ⚠ 문서 내 메모: "질문: PC에서 반응형일 때 어떻게 구현될지 문의"
설명: 데스크톱 전역 메뉴·유틸리티 링크·로고·주요 액션을 한 영역에 구성하는 compound. 하위 목적지가 있으면 trigger+content, 직접 이동은 trigger의 href.
import { Navigation, NavigationBar, NavigationColumn, NavigationLogo, NavigationMegaMenu, NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuTrigger } from "@BG002501-KT-Com/kt-ux-design/navigation"

## Navigation  (Omit<HTMLAttributes<HTMLElement>, "title">)
activeMenu → string | null ⟨undefined⟩ 제어 방식 열린 1depth 메뉴 값
defaultActiveMenu → string | null ⟨null⟩
onActiveMenuChange → (value: string | null) => void
sticky → boolean ⟨false⟩ 뷰포트 상단 고정
bordered → boolean ⟨true⟩ 루트 하단 경계선
theme → light | light-agent | dark | dark-agent ⟨전역 테마⟩
aria-label → string ⟨"주 메뉴"⟩ 루트 nav + 모바일 dialog 접근 이름
children → ReactNode  NavigationUtilityBar + NavigationBar
ref → Ref<HTMLElement>

## Composition (Export → 기반 요소/주요 props → 용도)
NavigationUtilityBar → HTMLAttributes<HTMLDivElement>, children, ref ⟨보조 목적지 링크 영역⟩
NavigationBar → HTMLAttributes<HTMLDivElement>, children, ref ⟨로고·메뉴·액션 본체⟩
NavigationLogo → AnchorHTMLAttributes, href="/", children, ref ⟨서비스 로고⟩
NavigationMenu → HTMLAttributes<HTMLUListElement>, children, ref ⟨1depth 메뉴 목록⟩
NavigationMenuItem → Omit<HTMLAttributes<HTMLLIElement>,"children">, value, active=false, children, ref ⟨trigger+content 상태 범위⟩
NavigationMenuTrigger → Omit<HTMLAttributes<HTMLElement>,"onClick">, href, children, ref ⟨content 있으면 열기 버튼, 없으면 링크⟩
NavigationMenuContent → HTMLAttributes<HTMLDivElement>, children, ref ⟨활성 메뉴 portal 콘텐츠⟩
NavigationMegaMenu → HTMLAttributes<HTMLDivElement>, children, ref ⟨메가메뉴 패널⟩
NavigationMegaMenuRow → HTMLAttributes<HTMLDivElement>, children, ref ⟨column 행 + 행 구분선⟩
NavigationColumn → Omit<HTMLAttributes<HTMLDivElement>,"title">, title, titleHref, defaultOpen=false, children, ref ⟨2depth 그룹⟩
NavigationLink → Omit<AnchorHTMLAttributes,"children">, href, external=false, badge, badgeTone="info", expandable, expanded, children, ref ⟨leaf 링크⟩
NavigationMenuLink → NavigationLink alias
NavigationDisclosure → label, open, defaultOpen=false, onOpenChange, children, ref ⟨column 안 4depth 링크 disclosure⟩
NavigationActions → HTMLAttributes<HTMLDivElement>, children, ref ⟨우측 액션 영역⟩
NavigationActionButton → ButtonHTMLAttributes, label, icon, ref ⟨아이콘 액션 버튼⟩
navigationVariants({sticky, bordered}) / NavigationVariants export. NavigationSurface = 내부 "bar" | "mobile" 표면 타입(소비자 prop 아님).

Examples: Default / Interaction
Figma: (없음)
