BADGE Mobile/Desktop/적응형
설명: 텍스트·이미지·상품·콘텐츠·계층형 메뉴를 반복 배치하는 컴포넌트 패밀리. 완성형은 용도별 preset, 직접 조합은 List + building block. 표준 HTML 속성·이벤트 지원, Mobile/Desktop 적응형 표면.
import { List, ListItem, ListItemButton, ListItemHeadline } from "@BG002501-KT-Com/kt-ux-design/list"
※ 형식: export 표(주요 props → 역할)

## 기본 조합 (building blocks)
List → children, theme ⟨기본 컨테이너⟩
ListItem → type, size, children ⟨텍스트·이미지·상품 구조 직접 조합 행⟩
ListItemHeadline → title, body, bodyType, icon ⟨제목·본문·상태 영역⟩
ListItemButton → variant: text | text-chevron | chevron, children ⟨행 우측 후속 동작⟩
ListItemImage → type, src, alt, iconButton ⟨목록 이미지 + 선택적 관심 버튼⟩
ListItemImageIconButton → active, 표준 button props ⟨이미지 위 관심 버튼⟩
ListItemTitle → body, label, type, size ⟨일반 이미지 목록 제목⟩
ListItemProductTitle → body, label, price, discountRate, tags, type ⟨상품명·가격·태그⟩
ListProductItemTags → tags ⟨문자열 또는 Tag 컴포넌트 배열⟩
각 export className, ref, 표준 속성 전달. 독립 컨테이너는 theme 지정 가능.

## 용도별 preset
ListText / ListTextItem → title, body, bodyType, icon, button, rightElement, depth, compact, inContainer ⟨1–3 depth 텍스트 목록⟩
ListLogo / ListLogoItem → size, src, label, body, showChevron, onClick ⟨원형 로고 목록⟩
ListImage / ListImageItem → src, alt, label, body ⟨가로 스크롤 이미지 목록⟩
ListProduct / ListProductItem → src, label, title, price, discountRate, tags, iconButton ⟨가로형 상품 목록⟩
ListProductGrid / ListProductGridItem → 상품 정보 props ⟨2열 상품 그리드⟩
ListItemNotice → headlineText, date, bodyText, chevron, state ⟨공지·알림 행⟩
ListSubtitle → subtitle, bodyText, showBodyText, compact ⟨섹션 보조 제목⟩

## 메뉴와 콘텐츠
ListMenu → children, theme ⟨계층형 메뉴 컨테이너⟩
ListMenuTitle → children, compact ⟨메뉴 섹션 제목⟩
ListMenuItem → depth, title, body, icon, isOpen, showDivider, compact ⟨1–3 depth 메뉴 항목. isOpen·하위 그룹 렌더링은 소비자 제어⟩
ListMenuGroup → depth: 2 | 3, children ⟨하위 메뉴 그룹⟩
ListContent → columns: 1 | 2 | 3 | 4, children, theme ⟨콘텐츠·아티클 목록/그리드. columns≥2면 vertical 항목 그리드⟩
ListContentItem → layout, headline, body, bodyLines, caption, label, imageSrc, imageAlt, tags, theme ⟨가로형·세로형·텍스트형⟩

## Variant exports
listVariants, listItemVariants, listHeadlineVariants, listButtonVariants, listImageVariants, listTitleVariants, listProductTitleVariants, listMenuVariants, listMenuItemVariants, listSubtitleVariants (+ *Variants 타입)

Examples: Default / Variants(텍스트·로고·이미지·공지·섹션 안내) / Products(상품 목록, 상품 그리드) / Content(가로형, 세로형) / Menu / Building Blocks / Interaction
Figma: List Text · 1/2/3 Depth / List Item Headline / List Item Notice
