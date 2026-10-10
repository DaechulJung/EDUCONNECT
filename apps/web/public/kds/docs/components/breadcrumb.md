BADGE Desktop
설명: Breadcrumb은 현재 페이지의 위치를 상위 경로부터 순서대로 보여주는 내비게이션. 링크, 현재 페이지, 홈 아이콘과 구분자를 조합해 정보 계층을 표현.
import { Breadcrumb, BreadcrumbHome, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@BG002501-KT-Com/kt-ux-design/breadcrumb"

## Interface (Export → 주요 props → 역할)  ※ 형식: export 표, prop 테이블 아님
Breadcrumb → aria-label, children, 표준 nav props ⟨루트 nav. 기본 접근성 레이블 "Breadcrumbs"⟩
BreadcrumbList → children, 표준 ol props ⟨경로 항목 순서 목록⟩
BreadcrumbItem → children, 표준 li props ⟨링크/현재 페이지 + 뒤따르는 구분자 묶음⟩
BreadcrumbLink → children, 표준 a props ⟨이동 가능한 상위 경로⟩
BreadcrumbHome → size, 표준 a props ⟨홈 아이콘 링크. 기본 아이콘 크기 20⟩
BreadcrumbPage → children, 표준 span props ⟨aria-current="page" 현재 페이지⟩
BreadcrumbSeparator → size, 표준 span props ⟨장식용 구분자. 기본 아이콘 크기 16⟩
각 export의 className, 이벤트, aria-*, data-* 표준 속성 전달 가능. 같은 이름의 Props 타입도 package export 포함.

Examples: Default / Variants (마이페이지 경로, 상품 상세 경로) / Interaction
Figma: Breadcrumb Type
