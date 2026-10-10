BADGE Mobile/Desktop/반응형
설명: 연속 범위에서 단일 값 또는 시작·종료 값 선택. 숫자 입력 필요 시 SliderRange 안에 SliderRangeInput 조합.
import { Slider } from "@BG002501-KT-Com/kt-ux-design/slider"

## Slider  (HTMLAttributes<HTMLDivElement>)
title → string ⟨undefined⟩
value → number ⟨0⟩
min / max → number ⟨0 / 100⟩
step → number ⟨1⟩
minLabel / maxLabel → string ⟨undefined⟩ 트랙 아래 양 끝
showPopover → boolean ⟨false⟩ 핸들 위 값 말풍선
formatValue → (value: number) => string ⟨String(value)⟩
disabled → boolean ⟨false⟩
onChange → (value: number) => void
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLDivElement>

## SliderRange  (Slider의 title, min, max, step, minLabel, maxLabel, disabled, theme 공유)
value → [number, number] ⟨[0, 100]⟩
onChange → (value: [number, number]) => void
children → ReactNode  범위 연동 보조 UI

## SliderRangeInput  (HTMLAttributes<HTMLDivElement>)
minValue / maxValue → number ⟨0 / 100⟩ 독립 사용 시 값, 부모 context 우선
min / max / step → number ⟨0 / 100 / 1⟩
unit → string
disabled → boolean ⟨false⟩
onChange → (value: [number, number]) => void  blur/Enter 보정값
ref → Ref<HTMLDivElement>
sliderVariants / SliderVariants export. mobile·desktop 최소 폭 조정.

Examples: Default / Variants(기본, 헤더 없음, 현재 값 표시, 범위, 범위 직접 입력) / States(단일·비활성·범위·범위 비활성·다크) / Interaction
Figma: Slider Desktop Type · Spec / Slider Mobile Type · Spec
