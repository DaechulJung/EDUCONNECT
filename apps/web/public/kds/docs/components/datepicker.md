BADGE Mobile/Desktop/반응형
설명: 날짜·기간·날짜+시간 선택 입력. 일반은 아래 달력 팝오버, DateRangePicker는 시작·종료일, timeSelection으로 시간 슬롯 추가.
import { DatePicker } from "@BG002501-KT-Com/kt-ux-design/date-picker" (+ @internationalized/date parseDate)

## DatePicker
value → CalendarDate | DateTimeValue | null ⟨undefined⟩
onChange → (value) => void
placeholder → string ⟨"날짜 선택"⟩
disabled → boolean ⟨false⟩
minValue / maxValue → CalendarDate ⟨undefined⟩
placement → auto | top | bottom ⟨bottom⟩ 팝오버 방향
timeSelection → TimeSelectionConfig ⟨undefined⟩ 날짜·시간 모드 + 시간 슬롯 설정
ariaLabel → string ⟨"날짜 선택"⟩
theme → Theme ⟨undefined⟩ 내부 달력 테마
className / classNames → string / DatePickerClassNames
ref → Ref<HTMLDivElement>

## DateRangePicker
DatePicker의 placeholder, disabled, minValue, maxValue, ariaLabel, theme, className, classNames, placement 공유. value → RangeValue<CalendarDate> | null, onChange → 선택 범위.

## Calendar family
Calendar / RangeCalendar (CalendarProps / RangeCalendarProps): value, onChange, minValue, maxValue, theme, className, classNames, ref. 직접 조합 시 I18nProvider locale 설정.

## Time family
TimeButton(TimeSlot 1개) / TimeButtonGroup(TimeOptionsConfig 슬롯 묶음). timeSelection.options: slots 직접 지정 또는 generate(시작·종료·간격), disabled 규칙으로 슬롯/범위 비활성.

Examples: Default / Date range / Time Picker / Interaction / Calendar / Accessibility(Escape 닫기, 시간 모드는 CTA로 확정)
Figma: Date Range Container / Time Picker
