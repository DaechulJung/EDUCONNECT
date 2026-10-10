# KDS 2.0 — 모바일·PC 컴포넌트 대응표

- 출처: KDS 2.0 마스터 키트 "Mobile–PC 컴포넌트 대응 관계" 페이지 (2026-09-06 기준)
- 컬럼: 컴포넌트 | MOBILE | PC | 대응 여부 | 비고. 컴포넌트명 오타는 키트 원문 그대로.

## 대응표 (43행)

| # | 컴포넌트 | MOBILE | PC | 대응 | 비고 |
|---|---|---|---|---|---|
| 1 | Accordion | 타이틀+레이블 | 타이틀+레이블 | O | - |
| 2 | Bottom Navigation | 탭 3개 | `모바일 전용이라 PC - X` | X | 모바일 전용 |
| 3 | Bottm Sheet | 바디 텍스트 / Image / 버튼 2개 | `모바일 전용이라 PC - X` | X | 모바일 전용 |
| 4 | Breadcrumb | `PC 전용이라 PC - X` (원문 그대로, MO 없음 의미) | 메뉴명 > 메뉴명 > 메뉴명 | X | PC 전용 |
| 5 | Button | 버튼, FAB | 버튼, FAB | O | - |
| 6 | Card | Outline, Filled (카테고리·타이틀·본문·레이블·Image) | Outline, Filled | O | 스펙 동일 |
| 7 | Data Visul | 도넛(42%/58%) + 타이틀·Text | 동일 | O | 스펙 동일 |
| 8 | Date Picker | — | — | O | - |
| 9 | Divider | Inset, Full Width | Inset | O | PC에서는 Full Width 사용하지 않음 |
| 10 | Dropdown | Basic, Line Info, Popover | Basic, Line Info, Popover | O | - |
| 11 | Dropdown | Text | `PC - 없음` | O | PC에서 활용 가능 |
| 12 | Indicator | Dot, Number(0/0), Progress | Dot, Number(0/0), Progress | O | 스펙 동일 |
| 13 | Item Tile | Vertical (Filled), Horizontal (Filled) | Vertical (Filled), Horizontal (Filled) | X | - |
| 14 | Item Tile | `MO - 없음` | Vertical (Outline), Horizontal (Outline) | X | MOBILE에 Outilne 타입 없음 |
| 15 | Loading | 처리 중 입니다. 잠시만 기다려 주세요. | 동일 | O | 스펙 동일 |
| 16 | List | Logo, Image(Default), Menu, Menu-Divider, List - Text(×2), List - Text Area, Image(Multi-Column), List - Notice | Vertical, Horizontal | X | 1대1 대응 가능한 컴포넌트 없음 |
| 17 | Notification | 텍스트 / 텍스트+레이블 (4종) | `PC - 없음` | O | 동일한 스펙 사용 가능 |
| 18 | Navigation | (모바일 내비) | (PC 내비) | O | 디바이스 별 최적화된 컴포넌트로 변환. Mobile에서 전체메뉴(햄버거) 터치 시 펼쳐지는 메뉴는 List_menu 컴포넌트 사용 |
| 19 | Pagination | `MO - 없음` | N N N … (10개) | X | MO 컴포넌트 없음 |
| 20 | Popup | Center Popup (Header Text/Body Text), Full Popup/ | Center Popup, Full Popup / Promotion Popup(Button) | O | - |
| 21 | Popup | `MO - 없음` | Promotion Popup (Full Image) | X | MO 컴포넌트 없음 |
| 22 | Selection Controls Checkbox | Checkbox Group, Checkbox List | Circle | O | - |
| 23 | Selection Controls Checkbox | Check List (세부 약관 내용) | `PC - 없음` | O | 동일한 스펙 사용 가능 |
| 24 | Selection Controls Checkbox | Checkbox Select | `PC - 없음` | X | PC 컴포넌트 없음 |
| 25 | Selection Controls Chip | Select, Filter | Select, Filter | O | PC내 Folder Chip Group은 없지만, scrollable 형태로 구현 가능 ※ |
| 26 | Selection Controls Chip | Input, Folder Chip Group | `PC - 없음` | X | PC 컴포넌트 없음 |
| 27 | Selection Controls Chip | `MO - 없음` | Multi-select | X | MO 컴포넌트 없음 |
| 28 | Selection Controls Select Button | Select Button Image (세로), Select Button Image (가로) | Vertical, Horizontal | O | - |
| 29 | Selection Controls Select Button | Vertical, Horizontal | Vertical, Horizontal | X | PC에 있는 아이콘, 체크박스로 인해 대응 X |
| 30 | Selection Controls Radio Button | Radio Button | Radio Button | O | - |
| 31 | Search | Outline, Underline | Outline, Underline | O | - |
| 32 | Search | Outline - Back Button, Underline - Back Button | `PC - 없음` | O | 모바일 전용 |
| 33 | Slider | Basic, Popover, Range | Basic, Popover, Range | O | 스펙 동일 |
| 34 | Tab | Fixed, Scrollable | Fixed, Fluid | O | - |
| 35 | Tab | `MO - 없음` | Fluid (2단) | X | MO 컴포넌트 없음 |
| 36 | Data Table | Data Table, List Table | Data Table, List Table | O | 스펙 동일 |
| 37 | Table | Text Information, Data | Text Information, Data | O | 스펙 동일 |
| 38 | Tag | Membership, Status | Membership, Status | O | 스펙 동일 |
| 39 | Text Field | Default, Password (Masking off), Password (Masking on), National ID, Business ID, Button, Text Area | Default, Password (Masking off), Password (Masking on), National ID, Business ID, Button, Text Area | O | - |
| 40 | Text Field | ID, Certification | `PC - 없음` | X | PC 없음 |
| 41 | Ttile | Title - Page, Title - Category, Title - Section, Title - List | `PC - 없음` | O | PC 화면 전환 시 PC에서 사용한 폰트 크기로 변환 |
| 42 | Tooltip | Toggle Tooltip, Auto Tooltip | Toggle Tooltip, Auto Tooltip | O | 스펙 동일 |
| 43 | Top Navigation | (모바일 Top Nav) | (PC Top Nav) | O | 디바이스 별 최적화된 컴포넌트로 변환. Mobile에서 전체메뉴(햄버거) 터치 시 펼쳐지는 메뉴는 List_menu 컴포넌트 사용 |

※ 25행 비고는 좌표상 Chip 1행(Select/Filter) 범위(y≈2205~2455)에 놓여 있으나 내용상 26행(Folder Chip Group)에 대한 설명으로 읽힘. 키트 배치 그대로 옮김.

## 요약

| 구분 | 수 | 행 |
|---|---|---|
| 대응 O | 29 | 1,5,6,7,8,9,10,11,12,15,17,18,20,22,23,25,28,30,31,32,33,34,36,37,38,39,41,42,43 |
| 대응 X | 14 | 2,3,4,13,14,16,19,21,24,26,27,29,35,40 |

- **모바일 전용 (PC 없음)**: Bottom Navigation, Bottom Sheet, Dropdown-Text(활용 가능), Notification(동일 스펙 사용), Check List(동일 스펙 사용), Checkbox Select, Chip Input/Folder Chip Group, Search Back Button, Text Field ID/Certification, Title(폰트 크기 변환)
- **PC 전용 (MO 없음)**: Breadcrumb, Item Tile Outline, Pagination, Promotion Popup (Full Image), Chip Multi-select, Tab Fluid
- **양쪽 있으나 대응 X**: Item Tile Filled(비고 없음), List(1:1 대응 없음), Select Button Vertical/Horizontal(PC 아이콘·체크박스 차이)
- **스펙 동일**: Card, Data Visual, Indicator, Loading, Slider, Data Table, Table, Tag, Tooltip
- **디바이스별 변환**: Navigation, Top Navigation (모바일 햄버거 메뉴 → List_menu)
