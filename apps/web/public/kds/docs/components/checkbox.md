BADGE Mobile/Desktop/적응형
설명: 여러 항목 중 하나 이상 선택/해제. 단독 체크박스, 목록, 카드, 버튼, 계층형 약관 구성을 하나의 public family로 제공.
import { Checkbox, CheckboxLabel } from "@BG002501-KT-Com/kt-ux-design/checkbox"
※ 형식: export 표(기반 요소/주요 props → 역할), prop 단위 테이블 아님

## 기본 선택
Checkbox → InputHTMLAttributes<HTMLInputElement>(type,size 제외); value, state, shape, theme ⟨native checkbox. shape: circle | square | icon. 단독 라벨 연결은 id/htmlFor⟩
CheckboxLabel → HTMLAttributes<HTMLElement>; htmlFor, value, as, theme ⟨기본 <label>, 상위가 label이면 as="span"⟩
CheckboxSelect → LabelHTMLAttributes<HTMLLabelElement>(htmlFor,onChange 제외); value, checked, defaultChecked, disabled, onChange, theme ⟨카드 전체 클릭 선택 항목⟩

## 그룹과 버튼 목록
CheckboxGroup → HTMLAttributes<HTMLDivElement>; name, value, defaultValue, onValueChange, disabled ⟨선택값 배열 소유 Root⟩
CheckboxGroupItem → LabelHTMLAttributes<HTMLLabelElement>; value, compact, htmlFor, disabled ⟨Root 안 Checkbox+Label 행⟩
CheckboxButtonList → HTMLAttributes<HTMLDivElement> ⟨버튼형 항목 수직 배치⟩
CheckboxButtonListItem → LabelHTMLAttributes<HTMLLabelElement>; title, body, checked, disabled, onChange, name, value, theme ⟨제목/제목+본문 버튼형 checkbox⟩

## 계층형 체크리스트
CheckList → HTMLAttributes<HTMLDivElement>; name, value, defaultValue, onValueChange, disabled ⟨계층형 CheckListItem 선택값 배열 소유⟩
CheckListItem → HTMLAttributes<HTMLDivElement>(onChange 제외); value, label, depth(1|2|3), hasChildren, isOpen, onToggle, disabled, theme
CheckListItemCheck → InputHTMLAttributes<HTMLInputElement>(type,size 제외); value, size, disabled, theme ⟨박스 없는 체크 아이콘, 단독 사용 가능⟩
모든 컴포넌트 className/이벤트/aria-*/data-*/ref 전달. checkboxVariants, CheckboxVariants public export.

Examples: Default / Variants(표시 형태 원형·사각형·아이콘, 카드 선택, 항목 그룹, 버튼 목록, 계층형 약관, 아이콘 체크) / States / Interaction
Figma: CheckList Type · Spec
