BADGE Mobile/Desktop/선택 surface 명시
설명: 텍스트 + 펼침 아이콘으로 구성된 가벼운 Dropdown family 트리거. 선택 메뉴는 Dropdown/DropdownContent/DropdownItem 조합. BottomSheet는 surface="sheet" + DropdownSheetContent.
import { DropdownContent, DropdownItem, Dropdown, DropdownText } from "@BG002501-KT-Com/kt-ux-design/dropdown"

## DropdownText  (HTMLAttributes<HTMLDivElement>, ref)
surface → listbox | sheet ⟨listbox⟩
value → string ⟨""⟩ 트리거 표시 텍스트
disabled → boolean ⟨false⟩
isOpen → boolean ⟨false⟩ chevron 회전
onClick → (event: MouseEvent<HTMLDivElement>) => void
theme → Theme ⟨전역 테마⟩

## Menu composition
Dropdown → open, value, onOpenChange, onValueChange, defaultOpen, defaultValue
DropdownContent → children, portal ⟨listbox⟩
DropdownSheetContent → children, theme, className ⟨BottomSheet⟩
DropdownItem → children, value, icon, selected ⟨선택 시 Root 값 갱신 + 닫힘⟩

Examples: Default / States(Default, Open, Disabled) / Interaction
Figma: Dropdown Text Type·Spec
접근성: sheet=dialog, listbox=listbox. Tab→Enter/Space 열기, 선택 후 trigger로 포커스 복귀.
