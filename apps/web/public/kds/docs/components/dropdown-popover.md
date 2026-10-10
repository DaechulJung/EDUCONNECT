BADGE Mobile/Desktop/작업 메뉴
설명: 트리거에 연결된 작업 메뉴. 편집·공유·삭제 등 후속 작업을 아이콘과 함께 표시.
import { DropdownPopover, DropdownPopoverItem, DropdownPopoverContent, DropdownPopoverTrigger } from "@BG002501-KT-Com/kt-ux-design/dropdown"
※ 문서 헤딩이 "DropdownPopover"로 2회(Root와 Content) — 예제 코드상 Content는 DropdownPopoverContent

## DropdownPopover (Root)
children → ReactNode  Trigger + Content
defaultOpen → boolean ⟨false⟩
open → boolean ⟨undefined⟩
onOpenChange → (open: boolean) => void
className, ref → Ref<HTMLDivElement>

## DropdownPopoverTrigger
children → ReactElement  트리거 요소 1개 (보통 Button)
disabled → boolean ⟨false⟩

## DropdownPopover(Content)
children → ReactNode  DropdownPopoverItem 목록
size → small | medium ⟨small⟩
side → top | right | bottom | left ⟨bottom⟩
align → start | center | end ⟨start⟩
sideOffset → number ⟨4⟩ px
portal → boolean ⟨true⟩
positioned → boolean ⟨true⟩ false면 trigger 기준 위치 계산 안 함
theme → Theme ⟨전역 테마⟩
className, DOM props, ref

## DropdownPopoverItem
children → ReactNode  텍스트
icon → ReactNode ⟨필수⟩ 왼쪽 아이콘
size → small | medium ⟨부모 값⟩
error → boolean ⟨false⟩ 주의 작업 색
textClassName → string
onClick, onKeyDown → DOM handler
className, DOM props, ref

Examples: Default / States(기본 및 오류 작업) / Sizes(Small, Medium) / Interaction
Figma: (없음)
접근성: 팝오버 role=menu, 항목 menuitem. Arrow Up/Down·Home·End 이동, Enter/Space 실행, Escape→트리거 포커스 복귀.
