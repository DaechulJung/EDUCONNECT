BADGE Mobile/Desktop/반응형
설명: 중요 정보 전달·확인·선택 요청 모달. Popup이 열림 상태·접근성 소유, PopupContent 안에서 Header·Body·Footer 조합.
import { Popup, PopupBody, PopupCloseButton, PopupContent, PopupFooter, PopupHeader, PopupTitle, PopupTrigger } from "@BG002501-KT-Com/kt-ux-design/popup"

## Popup (compound root)
children → ReactNode ⟨필수⟩ Trigger + Content
defaultOpen → boolean ⟨false⟩
open → boolean ⟨undefined⟩
onOpenChange → (open: boolean) => void
closeOnOverlayClick → boolean ⟨true⟩
closeOnEscape → boolean ⟨true⟩

## PopupContent  (HTMLAttributes<HTMLDivElement> + PopupVariants)
type → center | full | pc-basic-small | pc-basic-medium | pc-promotion-full-image | pc-promotion-button ⟨center⟩ Figma Popup 표면 타입
theme → Theme ⟨undefined⟩
children → ReactNode ⟨필수⟩

## Compound children
PopupTrigger ⟨단일 element 트리거⟩ / PopupHeader ⟨제목·서브타이틀·닫기 버튼 영역, closeButton prop으로 override⟩ / PopupIcon ⟨Center 상단 원형 아이콘⟩ / PopupTitle ⟨dialog 제목⟩ / PopupSubtitle ⟨Full·Promotion 한 줄 보조⟩ / PopupBody ⟨본문·이미지·스크롤⟩ / PopupFooter ⟨액션 버튼 + Full의 Home Indicator⟩ / PopupCloseButton ⟨아이콘 닫기 또는 asChild로 Button·TextButton에 닫기 합성⟩
닫기 버튼 기본값: full, pc-basic-small, pc-basic-medium, pc-promotion-button = 표시 / center, pc-promotion-full-image = 미표시.

Examples: Default / Mobile(Center, Full) / Desktop(Basic Small, Basic Medium, Basic Large, Promotion Full Image, Promotion Button) / Use Cases(해외 로밍 프로모션) / Variants(Default, With Icon) / Interaction / Accessibility(dialog role + modal focus, 숨김 제목 제공)
※ Examples에 "Basic Large"가 있으나 type 값에는 pc-basic-large 없음 — 확인 필요
Figma: Desktop Type·Spec·Use Case / Mobile Type·Spec·Use Case / Promotion Full Image Use Case
