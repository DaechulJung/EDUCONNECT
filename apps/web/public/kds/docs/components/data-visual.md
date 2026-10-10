BADGE (없음 — 배지 표시 없음)
설명: Recharts를 내부 엔진으로 쓰면서 KDS 차트 구조·색상·범례를 완성형 API로 제공. 소비자는 Recharts import/children/fill/color 없이 데이터 key와 표시 옵션만 지정.
- 루트 기본 크기 width:100%/height:100% → 부모 컨테이너가 높이 또는 aspect ratio 필수.
- Bar/Line은 Figma 데이터 밀도 기준. category 증가 시 가로 스크롤·label 축약·막대 축소 정책 미제공.
- 색상은 --data-visual-* semantic token, --gradient-graph-* token 고정. series color API 없음.
import { PieChart } from "@BG002501-KT-Com/kt-ux-design/data-visual"

## 공통  (카드형: HTMLAttributes<HTMLElement>, GradientSlider: HTMLAttributes<HTMLDivElement>, children 없음)
data → DataVisualDatum[] ⟨필수⟩ string/number/null/undefined 값 배열
title → string ⟨undefined⟩ 카드 헤더 제목
headerAction → ReactNode ⟨undefined⟩ 제목 오른쪽 선택/액션 (Recharts slot 아님)
legend → boolean ⟨true⟩ KDS semantic palette 범례
theme → Theme ⟨전역 테마⟩
className → string
ref → Ref<HTMLElement> figure

## PieChart / DonutChart
nameKey → string ⟨필수⟩
valueKey → string ⟨필수⟩
showValues → boolean ⟨true⟩
valueFormatter → (value: number) => string ⟨String⟩
centerValue → string | number ⟨Donut 필수⟩
centerLabel → string ⟨Donut 필수⟩

## BarChart / DualBarChart
categoryKey → string ⟨필수⟩
valueKey → string ⟨Bar 필수⟩
seriesLabel → string ⟨valueKey⟩
series → [DataVisualSeries, DataVisualSeries] ⟨Dual 필수⟩ 색상 미포함
orientation → horizontal | vertical ⟨vertical⟩
valueDomain → [number, number] ⟨자동 계산⟩ 오름차순, 음수 허용, 초과값 잘리지 않음

## LineChart
categoryKey → string ⟨필수⟩
series → DataVisualSeries[] ⟨필수⟩ 최대 5개, KDS palette 순서
valueDomain → [number, number] ⟨자동 계산⟩

## GradientChart / GradientSlider
categoryKey / valueKey → string ⟨필수⟩
headline → string ⟨필수⟩
totalLabel → string ⟨필수⟩
activeIndex → number
referenceValue → number ⟨데이터 평균⟩
referenceLabel → string ⟨totalLabel⟩
minLabel / maxLabel → string ⟨Slider 필수⟩
value → number 0–100 handle 위치 (생략 시 handle 숨김). GradientSlider는 비조작형 — 입력은 Slider 컴포넌트 사용.

Examples: Default / Chart Types(Pie, Donut, Bar, Dual Bar, Line, Gradient Chart, Gradient Slider) / Responsive / Value Domain
Figma: Pie / Donut / Horizontal Bar / Vertical Bar / Dual Horizontal Bar / Dual Vertical Bar / Gradient Chart / Gradient Slider / Line
