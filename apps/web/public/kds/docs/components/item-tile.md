BADGE Mobile/Desktop/반응형
설명: 상품 이미지·이름·가격·태그·좋아요 상태를 한 단위로 표시. 단일 상품=ItemTile, 1열/2열 목록=ItemTileList.
import { ItemTile } from "@BG002501-KT-Com/kt-ux-design/item-tile"

## ItemTile  (HTMLAttributes<HTMLDivElement> 확장)
layout → vertical | horizontal ⟨vertical⟩ 이미지·정보 배치 방향
thumbnailSrc → string  이미지 URL
thumbnailAlt → string ⟨""⟩
showLikeButton → boolean ⟨true⟩
liked → boolean ⟨false⟩
onLikeToggle → () => void  없으면 정적 표시
likeDisabled → boolean ⟨false⟩
label → string  브랜드/카테고리
name → string ⟨필수⟩ 상품명
discountRate → string  % 제외 할인율
price → string ⟨필수⟩ 원 제외 판매가
tags → string[]  최대 4개 태그

## ItemTileList  (HTMLAttributes<HTMLDivElement>)
columns → 1 | 2 ⟨1⟩ 1열 세로 목록 / 2열 그리드
children → ReactNode ⟨필수⟩ ItemTile 목록

Examples: Default / Variants(추천 상품 2열, 최근 본 상품 1열 horizontal) / States(할인 없음·좋아요·좋아요 비활성) / Interaction
Figma: Vertical Type·Spec / Horizontal Type·Spec
