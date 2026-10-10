BADGE Mobile
설명: 회원 등급·콘텐츠 카테고리·처리 상태 등 짧은 메타데이터 라벨 family. Membership / Category / Status. Tag.Membership 등 namespace도 동일 컴포넌트.
import { TagCategory, TagMembership, TagStatus } from "@BG002501-KT-Com/kt-ux-design/tag"

## TagMembership  (HTMLAttributes<HTMLSpanElement>, ref, className)
type → vvip | vip | gold | silver | all | standard | white ⟨vvip⟩
size → small | medium | large ⟨medium⟩
children → ReactNode ⟨필수⟩
theme → Theme ⟨전역 테마⟩

## TagCategory
type → basic | hot | new | recommand | sale ⟨basic⟩  ※ 공개 API 표기 "recommand" 그대로
size → small | medium | large ⟨medium⟩
children → ReactNode ⟨필수⟩
theme → Theme ⟨전역 테마⟩

## TagStatus
type → critical | default | disabled | info | progress | complete | warning | positive | custom-a | custom-b | neutral | inverse ⟨default⟩
display → fill | dot | text ⟨fill⟩
size → small | medium | large ⟨medium⟩
children → ReactNode ⟨필수⟩
theme → Theme ⟨전역 테마⟩
tagMembershipVariants, tagCategoryVariants, tagStatusVariants + 타입 export.

Examples: Membership 7종 / Category 5종 / Status 12종 / sizes(small·medium·large) / display(fill·dot·text)
Figma: (없음)
