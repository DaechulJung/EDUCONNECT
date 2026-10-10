BADGE Mobile
설명: 작업 결과·다음 행동 메시지를 화면 하단에 표시. 간단 결과=Toast, 메시지+액션/닫기=Snackbar.
import { Toast } from "@BG002501-KT-Com/kt-ux-design/notification"

## Toast  (HTMLAttributes<HTMLDivElement>)
children → ReactNode ⟨필수⟩ 메시지
icon → success | info | critical | off ⟨off⟩
showClose → boolean ⟨false⟩ 닫기 버튼 표시 시 자동 닫힘 비활성
open → boolean ⟨true⟩
duration → number ⟨3000⟩ ms, 0이면 자동 닫힘 없음
onClose → () => void  DOM 제거 시 호출
theme → Theme ⟨전역 테마⟩

## Snackbar  (HTMLAttributes<HTMLDivElement> children 제외)
message → string ⟨필수⟩
type → action | close  컨트롤 종류 (명시 필요)
icon → success | info | critical | off ⟨off⟩
actionElement → ReactNode  type="action"일 때 액션
open → boolean ⟨true⟩
duration → number ⟨4000⟩ ms, 0이면 자동 닫힘 없음
onClose → () => void
theme → Theme ⟨전역 테마⟩

## SnackbarTextButton  (Snackbar actionElement에 전달)
children → ReactNode ⟨필수⟩
onClick → () => void
className → string
theme → Theme ⟨dark⟩ Snackbar 어두운 표면용
toastVariants, snackbarVariants + Variant 타입 export.

Examples: Default(신청 완료, 혜택 안내) / Variants(저장 완료·가입 완료·이용 정보·결제 확인·변경 접수·데이터 안내) / Interaction
Figma: (없음)
