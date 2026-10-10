BADGE (없음 — 배지 표시 없음)
설명: 많은 정형 데이터를 정렬·선택·상태 표시·트리 구조로 구성하는 표. 정적 레이블·값 표는 Table 사용.
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@BG002501-KT-Com/kt-ux-design/data-table"
※ 형식: 컴포넌트 표(주요 props → 설명)

## Root and structure
DataTable → stickyHeader, columnDivider, scrollDim, containerClassName, theme, 표준 table props ⟨스크롤 컨테이너 + table root⟩
DataTableHeader → 표준 thead props
DataTableBody → 표준 tbody props
DataTableRow → selected, interactive, collapsed, 표준 tr props
DataTableCaption → 표준 caption props
DataTableToolbar → 표준 div props ⟨검색·필터·건수·액션 상단 영역⟩

## Cells
DataTableHead → type(default|checkbox|radio|none), align, rowSpan, colSpan, required, sortDirection(asc|desc|none), onSort, onFilter, filterActive, onMenu, interactive, state, columnDivider, columnHeader, checked, indeterminate, label, onCheckedChange, width
DataTableCell → align, rowSpan, colSpan, state, interactive, columnDivider, columnHeader, width
DataTableSelectionCell → as, children ⟨고정 폭 선택 셀⟩
DataTableTreeCell → depth, expandable, expanded, onToggle
DataTableLink → 표준 anchor props

## Selection and tree
DataTableCheckbox → label, indeterminate, 표준 checkbox props
DataTableRadio → label, 표준 radio props
DataTableTreeBody → rows, defaultExpandedIds, interactive, render children ⟨평평한 parentId 자료 → 계층 행⟩
useDataTableTree → rows, options ⟨확장 상태·행 접힘 계산⟩
tree helpers → isDataTableRowCollapsed, getDataTableTreeDepth, hasDataTableTreeChildren
고정 state는 문서·테스트 재현용, 일반 상호작용은 기본 상태.

Examples: Default / Variants(체크박스 선택, 라디오 선택, 서비스 구조 트리) / States(선택·완료·오류·비활성) / Interaction / RowSpan / ColSpan
Figma: (없음)
