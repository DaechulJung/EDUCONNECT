BADGE Mobile/Desktop/반응형
설명: 여러 액션 버튼을 하나의 영역에 배치하고 방향·여백을 일관 적용하는 컨테이너. Button과 TextButton을 자식으로 조합.
import { ButtonGroup } from "@BG002501-KT-Com/kt-ux-design/button-group"

## ButtonGroup  (HTMLAttributes<HTMLDivElement>, ref 지원)
type → CTA | Icon + Button | Confirmation | CTA - Vertical | Keyboard | Tertiary group ⟨CTA⟩ 버튼 배치 타입
scrolling → boolean ⟨false⟩ sticky 하단 배치에서 상단 Scroll Dim 표시
children → ReactNode  Button 또는 TextButton
theme → Theme ⟨전역 테마⟩

Examples: Showcase(취소/확인) / Types gallery: CTA(취소·확인) / Icon + Button(확인) / Confirmation(취소·확인) / CTA - Vertical(다음·이전·나중에) / Keyboard(계속·건너뛰기) / Tertiary group(취소·자세히 보기)
Figma: (없음)
