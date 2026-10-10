BADGE Mobile/Desktop/반응형
설명: 여러 옵션 중 하나만 선택. 그룹이 선택값·name 소유, 각 RadioButton은 값·레이블 구성.
import { RadioButton, RadioButtonGroup } from "@BG002501-KT-Com/kt-ux-design/radio-button"
※ 형식: export 표

RadioButtonGroup → HTMLAttributes<HTMLDivElement>(onChange 제외); value, defaultValue, onValueChange, name, disabled ⟨제어·비제어 선택값 + native radio group name. name 생략 시 자동 생성⟩
RadioButton → InputHTMLAttributes<HTMLInputElement>(native 상태 props 제외); value, size, children, compact, emphasizeSelectedLabel, htmlFor, disabled, theme ⟨Group 안 radio input 또는 input+label. children 생략 시 input만⟩
RadioButtonLabel → HTMLAttributes<HTMLElement>; children, value, disabled, htmlFor, as, theme ⟨분리 label 연결. 상위 label이면 as="span"⟩
RadioButtonVariants → size?: medium | small
모든 컴포넌트 className/이벤트/aria-*/data-*/ref 전달.

Examples: Default / Variants(크기 기본·작은, 여백 없음·기본, 분리 라벨) / States(선택 전·선택됨·비활성·선택된 상태로 비활성, 테마 Light·Dark) / Interaction
Figma: (없음)
