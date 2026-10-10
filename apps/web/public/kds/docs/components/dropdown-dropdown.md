BADGE Mobile/Desktop/적응형 트리거
설명: 옵션 중 하나 선택. Dropdown(Root)이 열림·선택 값 관리, DropdownTrigger+DropdownContent(listbox) 또는 DropdownSheetTrigger+DropdownSheetContent(BottomSheet) 조합. 작업 메뉴는 DropdownTrigger custom children + role="menu" 콘텐츠. 선택 시 onValueChange 1회 호출 후 surface 닫힘.
import { Dropdown, DropdownTrigger, DropdownContent, DropdownSheetContent, DropdownItem } from "@BG002501-KT-Com/kt-ux-design/dropdown"

## DropdownTrigger  (HTMLAttributes<HTMLDivElement>, ref)
label → string ⟨undefined⟩ noLabel true면 접근성 이름으로만
noLabel → boolean ⟨false⟩ 레이블 숨기고 한 줄 형태
value → string ⟨undefined⟩ 선택 값 표시, complete 상태
placeholder → string ⟨undefined⟩ 데스크톱 안내 문구
children → ReactNode ⟨undefined⟩ 기본 레이블·값·chevron 대신 트리거 내용
state → default | complete | disabled ⟨default⟩ disabled prop 우선
disabled → boolean ⟨false⟩
error → boolean ⟨false⟩ 오류 테두리
isOpen → boolean ⟨false⟩ Root 안에서는 Root 상태 우선
onClick → (event: MouseEvent<HTMLDivElement>) => void
theme → Theme ⟨전역 테마⟩
aria-haspopup → listbox | menu | dialog ⟨surface 기본값⟩

## Public compound children
Dropdown → defaultOpen, defaultValue, open, value, onOpenChange, onValueChange, children, className, ref ⟨Root⟩
DropdownContent → children, portal(기본 true), theme, role(기본 listbox), align, sideOffset, className, DOM props, ref
DropdownSheetTrigger → DropdownTrigger와 동일 props ⟨BottomSheet 여는 trigger⟩
DropdownSheetContent → children, theme, className, DOM props, ref ⟨BottomSheet로 표시⟩
DropdownItem → children, icon?, selected?, value?, error?, disabled?, onClick, className, DOM props, ref ⟨Root 안에서 value가 선택·닫힘 연결⟩

## Styling helpers
dropdownVariants/DropdownVariants (state, error, noLabel) · dropdownContentVariants · dropdownItemVariants

Examples: Default / Menu / Variants(With label, Without label) / States(Default, Complete, Error, Disabled) / Listbox / BottomSheet / Interaction / Mobile Interaction
Figma: Dropdown Trigger Type·Spec
접근성: DropdownTrigger=combobox+listbox/option, DropdownSheetTrigger=dialog+radiogroup/radio. Enter/Space 열기, Arrow/Home/End 이동, Escape/Dim 닫기.
