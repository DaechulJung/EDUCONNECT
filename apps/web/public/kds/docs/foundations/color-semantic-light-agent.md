BADGE (foundation — 배지 없음)  Color Token : Light/Agent
토큰 수 303 (light/default와 동일 집합). 아래 107개만 값이 다르고 나머지 196개는 light/default와 동일 → `foundations-color-semantic-light／default--docs.txt` 참조.
형식: name → agent 값 (def light/default 값)

## Background / Surface
background-default → #f3f4f6 (def #fff)
surface-primary-01 → #f3f4f6 (def #fff)
surface-primary-02 → #fff (def #f8f9fa)
surface-primary-03 → #f3f4f6 (def #fff)
## Icon (01/02/03 값이 서로 교차, 04는 동일)
icon-secondary-01 → #4a4c50 / -02 → #55585d / -03 → #4a4c50 (def #55585d / #4a4c50 / #55585d)
icon-tertiary-01 → #61646b / -02 → #6f737b / -03 → #61646b (def #6f737b / #61646b / #6f737b)
icon-disabled-01 → #9fa4ad / -02 → #adb1b9 / -03 → #9fa4ad (def #adb1b9 / #9fa4ad / #adb1b9)
icon-feedback-info-01 → #005e66 / -02 → #007f7f / -03 → #005e66 (def #007f7f / #005e66 / #007f7f)
icon-feedback-critical-01 → #bb1b21 / -02 → #e0282f / -03 → #bb1b21 (def #e0282f / #bb1b21 / #e0282f)
## Text (동일 패턴)
text-secondary-01 → #4a4c50 / -02 → #55585d / -03 → #4a4c50
text-tertiary-01 → #61646b / -02 → #6f737b / -03 → #61646b
text-disabled-01 → #9fa4ad / -02 → #adb1b9 / -03 → #9fa4ad
text-feedback-info-01 → #005e66 / -02 → #007f7f / -03 → #005e66
text-feedback-critical-01 → #bb1b21 / -02 → #e0282f / -03 → #bb1b21
## Fill
fill-secondary-01, -03 → #d5d8dd (def #e9eaee)
fill-secondary-hover-01, -03 → #c7cad1 (def #d5d8dd)
fill-secondary-pressed-01, -03 → #b9bdc5 (def #c7cad1)
fill-tertiary-hover-01 → #e9eaee / -02 → #f3f4f6 / -03 → #e9eaee (def #f3f4f6 / #e9eaee / #f3f4f6)
fill-tertiary-pressed-01 → #d5d8dd / -02 → #e9eaee / -03 → #d5d8dd (def #e9eaee / #d5d8dd / #e9eaee)
fill-disabled-01 → #e9eaee / -02 → #f3f4f6 / -03 → #e9eaee (def #f3f4f6 / #eeeff2 / #f3f4f6)
fill-feedback-critical-hover → #fadbdc (def #fce9e9)
fill-feedback-critical-pressed → #f2a6a9 (def #fadbdc)
## Dim
dim-gradient-chip-default → linear-gradient(90deg, #F3F4F600 0%, var(--gray-50) 100%)
dim-gradient-chip-folder → linear-gradient(90deg, #F3F4F600 0%, var(--gray-50) 40%)
dim-gradient-prompt-background → linear-gradient(180deg, #F3F4F600 0%, var(--background-default) 100%)
dim-gradient-data-table → linear-gradient(180deg, #f3f4f600 0%, var(--background-default) 70%)
dim-gradient-cta-dafault → linear-gradient(180deg, #f3f4f600 0%, var(--background-default) 77%)
## Border
border-primary-01, -03 → #7a7e86 (def #8b8f97)
border-primary-hover-01 → #4a4c50 / -02 → #55585d / -03 → #4a4c50 (def #55585d / #4a4c50 / #55585d)
border-secondary-01 → #d5d8dd / -02 → #e9eaee / -03 → #d5d8dd (def #e9eaee / #d5d8dd / #e9eaee)
border-tertiary-01, -03 → #e9eaee (def #f3f4f6)
border-subtle-01, -03 → #c7cad1 (def #d5d8dd)
border-disabled-01 → #c7cad1 / -03 → #b9bdc5 (def #d5d8dd)
## Tag (기본 토큰만 변경, -02 변형은 default와 동일)
tag-membership-fill-silver → #61646b / -white → #d5d8dd / -standard → #d5d8dd
tag-membership-text-secondary → #4a4c50
tag-status-fill: default → #d5d8dd / progress → #c2ebff / positive → #d0edc9 / complete → #d5d8dd / info → #cdeeee / warning → #ffe8d1 / critical → #fadbdc / custom-a → #e2f0c6 / custom-b → #e7e0ff / disabled → #e9eaee
tag-status-text: default → #4a4c50 / disabled → #9fa4ad
tag-status-text-lighten: default → #61646b / progress → #0049a3 / positive → #136600 / complete → #1e1f20 / info → #005e66 / warning → #8f4800 / critical → #bb1b21 / custom-a → #426600 / custom-b → #4c00e5 / disabled → #9fa4ad
tag-category-fill: basic → #d5d8dd / recommend → #cdeeee / sale → #fadbdc / hot → #c2ebff / new → #e7e0ff
tag-category-text-basic → #4a4c50
## 기타
chip-fill-inactive-default → #fff (def #f3f4f6)
table-cell-header-fill → #e9eaee (def #f3f4f6)
switch-fill-disabled → #c7cad1 (def #d5d8dd)
gradient-skeleton-element → #eeeff2 (def #f3f4f6)
gradient-skeleton → linear-gradient(107deg, rgba(233,234,238,0) 30%, rgba(233,234,238,0.5) 45%, rgba(233,234,238,0.5) 55%, rgba(233,234,238,0) 70%)
