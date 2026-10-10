BADGE Mobile/Desktop/디자인 동일
설명: 관련 정보를 행·열로 구조화해 비교. 간단 레이블·값 정보와 여러 데이터 열을 같은 semantic table 조합으로. 좁은 화면에서 루트 container가 가로 스크롤 소유.
import { Table, TableBody, TableCaption, TableCell, TableHead, TableRow } from "@BG002501-KT-Com/kt-ux-design/table"

## Table  (TableHTMLAttributes<HTMLTableElement>, ref)
firstColumnDivider → boolean ⟨true⟩ 첫 열과 나머지 사이 세로 구분선
theme → Theme ⟨전역 테마⟩
children → ReactNode  caption, header, body

## Composition (Export → 요소/상속 props → 추가 props)
TableHeader → thead / HTMLAttributes<HTMLTableSectionElement>
TableBody → tbody
TableRow → tr / HTMLAttributes<HTMLTableRowElement>
TableHead → th / ThHTMLAttributes; align?: left | center | right ⟨scope로 관계 지정, 기본 scope="col"⟩
TableCell → td / TdHTMLAttributes; align?: left | center | right
TableCaption → caption
규칙: 금액·수치 열 align="right", 행 의미 첫 셀은 TableHead scope="row".

Examples: Default(인터넷 요금 안내 key-value) / Variants(요금제 비교, 부가 혜택) / Type Cases(데이터 표 7열, 텍스트 정보 표)
Figma: Table Type · Spec
