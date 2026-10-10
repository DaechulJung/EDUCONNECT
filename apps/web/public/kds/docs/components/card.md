BADGE Mobile/Desktop/디자인 동일
설명: 이미지·제목·본문·액션을 하나의 콘텐츠 단위로 묶음. 이미지 중심 프로모션부터 테두리/채움 배경 정보 카드까지 같은 compound API.
import { Card, CardImage, CardTitle } from "@BG002501-KT-Com/kt-ux-design/card"

## Card  (HTMLAttributes<HTMLDivElement> 확장)
type → fullImage | imageText | outlined | filled ⟨fullImage⟩ 표면·콘텐츠 배치 방식
size → large | medium ⟨large⟩ Full Image·Image Text 크기
layout → vertical | horizontal ⟨콘텐츠 카드는 vertical⟩ Outlined·Filled 배치 축
onDark → boolean ⟨false⟩ 이미지 위 텍스트 inverse 색상
theme → Theme ⟨전역 테마⟩
children → ReactNode ⟨필수⟩ CardImage, CardTitle 조합

## Compound children
CardImage → 표준 img props, type, size, layout  부모 Card variant 기본 사용
CardTitle → title, subtitle, body, children, type, size, layout, onDark  텍스트 + 선택적 액션 영역(children에 Button/TextButton 조합)
cardVariants, cardImageVariants, cardTitleVariants + Variant 타입 package export.

Examples: Default / Variants(fullImage, imageText, outlined, filled 각 예시) / Sizes(large, medium)
Figma: (없음)
