BADGE Mobile/Desktop/반응형
설명: Accordion은 제목을 선택해 관련 콘텐츠를 펼치고 접는 compound 컴포넌트. AccordionItem 안에 AccordionHeader와 AccordionContent를 배치하고, 루트의 type으로 동시에 열 수 있는 항목 수를 정한다.
import { Accordion, AccordionContent, AccordionHeader, AccordionItem } from "@BG002501-KT-Com/kt-ux-design/accordion"

## Accordion  (Omit<HTMLAttributes<HTMLDivElement>, "onChange"> 확장)
type → single | multiple ⟨single⟩ 동시 오픈 방식
collapsible → boolean ⟨true⟩ single 모드의 열린 항목 재선택 허용 여부
disabled → boolean ⟨false⟩ 전체 항목 비활성화 여부
theme → light | light-agent | dark | dark-agent ⟨전역 테마⟩
value → string 또는 string[] ⟨undefined⟩ 제어형 오픈 항목 값
defaultValue → string 또는 string[] ⟨undefined⟩ 비제어형 초기 오픈 항목 값
onValueChange → (value: string | string[]) => void
children → ReactNode  AccordionItem 구성
className / ref(HTMLDivElement)

## AccordionItem  (Omit<HTMLAttributes<HTMLDivElement>, "id"> 확장)
value → string ⟨필수⟩ 오픈 항목과 매칭되는 식별자
disabled → boolean ⟨false⟩ 해당 항목 비활성화 여부
id → string ⟨자동 생성⟩ 헤더·콘텐츠 접근성 ID 기준값
children → ReactNode ⟨필수⟩ AccordionHeader·AccordionContent 구성
className / ref

## AccordionHeader  (Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> 확장)
label → ReactNode ⟨undefined⟩ 제목 위 보조 레이블
headingLevel → 2 | 3 | 4 | 5 | 6 ⟨3⟩ 제목 계층 수준
children → ReactNode ⟨필수⟩ 헤더 제목
disabled → boolean ⟨아이템 상태⟩ 헤더 비활성화 여부
onClick → MouseEventHandler<HTMLButtonElement>
className / ref(HTMLButtonElement)

## AccordionContent  (HTMLAttributes<HTMLDivElement> 확장)
forceMount → boolean ⟨false⟩ 닫힌 콘텐츠의 DOM 유지 여부
children → ReactNode ⟨필수⟩ 콘텐츠 영역
className / ref

## AccordionType (Export)
AccordionType → "single" | "multiple"  type과 오픈 값 타입 구분

접근성: heading 안의 button + role="region" 콘텐츠를 aria-controls / aria-labelledby로 연결. 키보드 이동, Enter/Space로 열고 닫음.
Examples: Default / States (Multiple, Non-collapsible, Disabled item) / Responsive
Figma: Accordion Type / Spec
