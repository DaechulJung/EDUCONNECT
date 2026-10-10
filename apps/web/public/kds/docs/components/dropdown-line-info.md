BADGE Mobile/Desktop/선택 surface 명시
설명: 회선 번호 + 잠금 상태를 함께 보여주는 Dropdown family 트리거. Dropdown/DropdownContent/DropdownItem과 조합. 잠금 버튼은 메뉴 열기와 분리된 토글. DropdownContent=listbox, DropdownSheetContent=BottomSheet (surface 타입 일치 필요).
import { DropdownLineInfo, DropdownContent, DropdownItem, Dropdown } from "@BG002501-KT-Com/kt-ux-design/dropdown"

## DropdownLineInfo  (HTMLAttributes<HTMLDivElement>, ref)
surface → listbox | sheet ⟨listbox⟩ 연결할 선택 surface
value → string ⟨""⟩ 그대로 표시할 회선 번호 (마스킹은 소비자가 값으로 전달)
locked → boolean ⟨true⟩ 잠금 아이콘 + 접근성 상태만 제어 (표시 문자열 불변)
disabled → boolean ⟨false⟩ 트리거+잠금 버튼 비활성
isOpen → boolean ⟨false⟩
onClick → (event: MouseEvent<HTMLDivElement>) => void
onLockClick → (event: MouseEvent<HTMLButtonElement>) => void
theme → Theme ⟨전역 테마⟩

Examples: Default / Listbox / BottomSheet / States(Locked line, Unlocked line) / Interaction
Figma: Line Info Type·Spec
접근성: surface="sheet"=dialog, 기본=listbox. 잠금 버튼은 locked에 따른 accessible name + aria-pressed, 분리된 포커스 순서.
