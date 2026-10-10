BADGE Mobile/모바일 전용
설명: 모바일 화면의 페이지·카테고리·섹션·목록 제목 계층. 제목 아래 설명 + Section/List 보조 아이콘.
import { Title } from "@BG002501-KT-Com/kt-ux-design/title"

## Title  (HTMLAttributes<HTMLDivElement>, native children·title 제외)
type → page | category | section | list ⟨page⟩ 정보 계층·레이아웃
title → ReactNode ⟨필수⟩
body → ReactNode  Page/Section/List 보조 문구 (Category 미표시)
icon → ReactNode  Section/List 제목 옆 장식 아이콘
size → medium | large ⟨large⟩ Page·Section 제목 크기만 영향
compact → boolean ⟨false⟩ Category/Section/List 세로 여백 최소화
theme → Theme ⟨전역 테마⟩
ref → Ref<HTMLDivElement>
titleVariants, titleHeadingVariants, titleBodyVariants, titleIconVariants export.

Examples: Default / Variants(page, category, section, list) / Sizes / States(compact, icon)
Figma: Title Type / Title Spec
