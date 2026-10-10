BADGE Mobile/Desktop/적응형
설명: 카드 형태 여러 항목 중 하나 이상 선택. 선택 상태는 Root 소유, SelectButtonItem이 콘텐츠 제공. 모바일=레이블만, Desktop=이미지·보조 문구·가로형 체크 아이콘.
import { SelectButton, SelectButtonItem } from "@BG002501-KT-Com/kt-ux-design/select-button"

## SelectButton  (HTMLAttributes<HTMLDivElement>)
columns → 2 | 3 ⟨2⟩
layout → vertical | horizontal ⟨vertical⟩ Desktop 아이템 콘텐츠 배치
checkIcon → boolean ⟨true⟩ Desktop 가로형 체크 아이콘
value → string[]  제어 모드
defaultValue → string[] ⟨[]⟩
onValueChange → (value: string[]) => void
children → ReactNode ⟨필수⟩
ref → Ref<HTMLDivElement>

## SelectButtonItem  (LabelHTMLAttributes<HTMLLabelElement>, children·onChange 자체 계약)
value → string ⟨필수⟩
children → ReactNode ⟨필수⟩ 레이블
subtext → ReactNode  Desktop 보조 문구
image → string  Desktop 이미지 URL
disabled → boolean ⟨false⟩
name → string  내부 checkbox form 이름
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLLabelElement>

Examples: Default / Variants(서비스 선택 4개, 이용 기간 3열, 요금제 비교 subtext) / States / Interaction
Figma: (없음)
