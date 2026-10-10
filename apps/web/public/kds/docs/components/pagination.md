BADGE Desktop/PC 전용
설명: 여러 페이지로 나뉜 콘텐츠의 현재 위치 확인·이동. 루트가 페이지 상태 관리, 목록+이동 버튼 조합.
import { Pagination, PaginationContent, PaginationFirst, PaginationItem, PaginationLast, PaginationList, PaginationNext, PaginationPrevious } from "@BG002501-KT-Com/kt-ux-design/pagination"

## Pagination  (ComponentProps<"nav">)
total → number ⟨필수⟩ 전체 페이지 수
page → number ⟨undefined⟩ 제어 모드 현재 페이지
defaultPage → number ⟨1⟩
disabled → boolean ⟨false⟩ 모든 하위 이동 컨트롤 비활성
onPageChange → (page: number) => void  범위 보정된 페이지 변경 시
children → ReactNode

## Composition
PaginationContent → ComponentProps<"ul"> ⟨페이지 항목 목록⟩
PaginationItem → ComponentProps<"li">
PaginationList → siblingCount?: number, boundaryCount?: number ⟨페이지 번호 자동 생성⟩
PaginationFirst / PaginationPrevious → ButtonHTMLAttributes
PaginationNext / PaginationLast → ButtonHTMLAttributes
usePagination(options) public export: page, total, siblingCount, boundaryCount → 숫자 + "start-ellipsis" | "end-ellipsis" 배열

Examples: Default(1~5…10) / States(페이지 생략, 비활성) / Interaction
Figma: Pagination Type · Spec
