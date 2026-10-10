BADGE Mobile
설명: 화면 하단에서 주요 목적지 사이를 이동하는 선택형 내비게이션. BottomNavigationItem을 자식으로 조합. 인앱 브라우저의 이전·다음·닫기 제어에는 독립형 BottomNavigationInAppBrowser 사용.
import { BottomNavigation, BottomNavigationItem } from "@BG002501-KT-Com/kt-ux-design/bottom-navigation"
import { IcLineHome, IcLineSearch } from "@BG002501-KT-Com/kt-ux-design/icon"

## BottomNavigation  (HTMLAttributes<HTMLDivElement> 확장, onChange 대신 onValueChange)
children → ReactNode ⟨필수⟩ BottomNavigationItem 조합
value → string ⟨undefined⟩ 제어 방식 현재 선택 값
defaultValue → string ⟨""⟩ 비제어 초기 선택 값
onValueChange → (value: string) => void
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLDivElement>

## BottomNavigationItem  (BottomNavigation 안에서만 사용)
label → string ⟨필수⟩ 표시 문구 + accessible name
value → string ⟨label⟩ 선택 상태 식별 값
icon → ReactNode ⟨undefined⟩ 레이블 위 아이콘
disabled → boolean ⟨false⟩ 선택·키보드 입력 비활성화
state → default | selected | disabled ⟨선택 상태로 계산⟩ 시각 상태 명시 지정
onClick → () => void
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLDivElement>

## BottomNavigationInAppBrowser  (HTMLAttributes<HTMLDivElement> 확장, 내부 아이콘 버튼은 비공개)
onPrevClick / onNextClick / onCloseClick → () => void
prevDisabled → boolean ⟨false⟩
nextDisabled → boolean ⟨false⟩
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLDivElement>
BottomNavigationContextValue 타입 = compound 선택 계약 public type

Examples: Default(홈·혜택·검색·마이) / Variants(3 items, 4 items) / States(선택·기본·비활성) / In App Browser(기본·이전 비활성·다음 비활성) / Interaction
Figma: (없음)
