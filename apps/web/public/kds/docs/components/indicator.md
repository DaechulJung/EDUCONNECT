BADGE Mobile/Desktop
설명: 페이지·상품 이미지·단계형 입력의 현재 위치/진행 상태를 짧게 안내하는 패밀리. DotIndicator, NumberIndicator, ProgressIndicator.
import { DotIndicator } from "@BG002501-KT-Com/kt-ux-design/indicator"

## DotIndicator  (HTMLAttributes<HTMLDivElement>)
total → number (Figma 기준 2–7) ⟨필수⟩
current → number ⟨필수⟩ 0-based 활성 인덱스
size → medium | large ⟨large⟩ dot 크기·활성 dot 폭
theme → default | inverse ⟨default⟩ 밝은/어두운 배경 팔레트
ref → Ref<HTMLDivElement>

## NumberIndicator  (HTMLAttributes<HTMLDivElement>)
type → basic | playback | selector ⟨basic⟩ 숫자 + 보조 컨트롤 조합
size → medium | large ⟨large⟩ 높이·타이포
current / total → number ⟨필수⟩
indicatorTheme → default | inverse ⟨default⟩ 반투명 검정/흰색 배경
isPlaying → boolean ⟨false⟩ Playback 재생 상태
onPlaybackClick → () => void
onSelectorClick → () => void
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLDivElement>
Playback·Selector는 내부 버튼 렌더. Basic에는 callback 전달 안 함.

## ProgressIndicator  (HTMLAttributes<HTMLDivElement>)
type → basic | dot ⟨basic⟩ 단계형 막대 / 연속 트랙
total → number (Figma 기준 2–5) ⟨필수⟩
current → number ⟨필수⟩ 완료된 단계 수
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLDivElement>

## Public helpers
dotIndicatorVariants / numberIndicatorVariants(type,size,indicatorTheme) / progressIndicatorVariants(type) + 타입

Examples: Default / Variants(Dot, Number 2/5 ×3, Progress) / States(Dot current, Progress current) / Interaction / Use Cases(요금제 변경 화면)
Figma: Indicator Type · Spec · Use Case overview / Use Case 1. Dot / 2. Number / 3. Progress
