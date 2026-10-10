BADGE Mobile/Desktop/적응형
설명: 옵션, 필터, 입력값, 다중 선택 조건을 짧은 레이블로 표현. 단일 Chip + 가로 스크롤/펼침 가능 그룹.
import { SelectChip } from "@BG002501-KT-Com/kt-ux-design/chip"

## Chip 종류 (공통: 버튼 속성 + children, active("off"|"on", 기본 "off"), theme, ref)
SelectChip → 추가 계약: asChild ⟨일반 선택 옵션. 링크 렌더 시 단일 non-Fragment element. aria-current·aria-pressed는 소비자 선택⟩
FilterChip → chevron 아이콘 내장 ⟨필터 조건 열기/적용⟩
InputChip → onIconClick(event) ⟨입력 조건 표시 + 삭제 액션⟩
MultiSelectChip → check 아이콘 내장 ⟨Desktop 고정 스펙 다중 선택 항목. Mobile 전환 관계 추론 안 함⟩

## 그룹
ChipGroup → HTMLAttributes<HTMLDivElement> ⟨한 줄 배치 + 가로 스크롤 + 끝단 dim⟩
FolderChipGroup → HTMLAttributes<HTMLDivElement>(onClick 제외); expanded, defaultExpanded, onExpandedChange ⟨제어·비제어 펼침 + 토글 버튼 소유⟩
FolderChipGroupToggleButton → ButtonHTMLAttributes<HTMLButtonElement>; expanded ⟨독립 토글 버튼⟩
public export: selectChipVariants, filterChipVariants, inputChipVariants, multiSelectChipVariants, folderChipGroupVariants + Variant 타입

Examples: Default / Variants(Select, Filter, Input, Multi Select·Desktop) / Composition(Link, Disabled link) / Groups(가로 스크롤, 펼침 가능) / States / Interaction / Use Cases(브랜드 필터, 요금제 필터, 최근 검색어, 카테고리)
Figma: (없음)
