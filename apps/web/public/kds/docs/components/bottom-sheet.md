BADGE Mobile
설명: 화면 하단에서 올라오는 모달 시트. BottomSheet=Root(열림 상태 소유), BottomSheetTrigger=여는 동작, BottomSheetContent=portal/dialog surface. Header·본문·Footer는 Content 안에서 자유 조합.
- Figma Size → BottomSheetContent layout="flexible" | "max-height"로만 매핑. Content Type은 variant 아님 — 기존 KDS 컴포넌트(Button, ButtonGroup, TextField, Search, Checkbox, RadioButton, Divider)를 children으로 조합, 필요 시 BottomSheetContentCustom을 얇은 wrapper로.
- BottomSheetHeader type: default, depth, image, search, none. image = 이미지 렌더 prop 아님, leading/chevron 없는 Header 액션 레이아웃. 이미지는 BottomSheetFullImage / BottomSheetPromotionSlide를 별도 Content child로.
- BottomSheetContentCustom = Figma Contents 영역 좌우 20px inset + 위아래 여백 소유. 안에 ContentText/ContentTextList 중첩 금지.
- Full Image Promotion = 모바일 조합: layout="flexible" + 420px 콘텐츠 높이 + Header type="image" + 이미지·Dot·Home Indicator. PC PromotionPopup은 별도 surface.
import { BottomSheet, BottomSheetCloseButton, BottomSheetContent, BottomSheetContentText, BottomSheetFooter, BottomSheetHeader, BottomSheetHeaderTitleArea, BottomSheetTitle, BottomSheetTrigger } from "@BG002501-KT-Com/kt-ux-design/bottom-sheet"

## BottomSheet
children → ReactNode ⟨필수⟩ Trigger + Content 조합
open → boolean ⟨undefined⟩ 제어형 열림
defaultOpen → boolean ⟨false⟩
onOpenChange → (open: boolean) => void

## BottomSheetTrigger
children → ReactNode ⟨필수⟩ asChild일 때 단일 요소
asChild → boolean ⟨true⟩
disabled → boolean ⟨false⟩

## BottomSheetContent  (Omit<HTMLAttributes<HTMLDivElement>,"children"> + BottomSheetVariants)
layout → flexible | max-height ⟨flexible⟩ Figma Size ↔ 시트 높이·스크롤 규칙
children → ReactNode ⟨필수⟩ Header·본문·Footer
closeOnOverlayClick → boolean ⟨true⟩
closeOnEscape → boolean ⟨true⟩
ref → Ref<HTMLDivElement>

## BottomSheetHeader
type → default | depth | image | search | none ⟨default⟩ Figma Sheet Header 배치 타입
children → ReactNode  Title, Search, Back/Close action 조합

## Composition children (Child → Values → Required → 설명)
BottomSheetHeader → type ⟨선택⟩
BottomSheetHeaderTitleArea → children ⟨선택⟩ Title + Body 묶음
BottomSheetTitle, BottomSheetBody → text children ⟨선택⟩ 제목·보조 설명
BottomSheetBackButton, BottomSheetCloseButton → button props ⟨선택⟩ Depth 이동·닫기
BottomSheetHeaderSearch → Search props ⟨선택⟩ Search Header 검색 필드+제목
BottomSheetContentText, BottomSheetContentTextList → text/list children
BottomSheetContentCheckList, BottomSheetContentIconList → list children
BottomSheetContentImage, BottomSheetContentImageList, BottomSheetContentCustom → 기존 KDS children, body scroll 경계
BottomSheetTextListItem, BottomSheetImageListItem, BottomSheetIconListItem → item props + children
BottomSheetFooter → button group children  하단 CTA
BottomSheetFullImage, BottomSheetFullImageList, BottomSheetPromotionSlide → image/slide children  Header 밖 full-bleed 이미지
규칙: type="depth"는 BackButton+CloseButton 함께. type="none"은 Header 숨김이 아니라 스펙의 12px 여백 표현.

Examples: Default / Layouts(Flexible, Max height) / Sheet Header Types / Use Cases(Custom, Text, Depth, Text List, Check List, Radio List, Icon List, Promotion, Search, Image List, Terms-ARS, Input Stack) / Interaction
Figma: 전체 구조 / Size matrix / Sheet Header matrix / Image Header example / Max Height example / Mobile Promotion Full Image / PC PromotionPopup(별도 surface)
