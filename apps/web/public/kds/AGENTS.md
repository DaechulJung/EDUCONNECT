# KDS 2.0 — AI 코딩 규칙 (해커톤판)

이 저장소로 화면을 만드는 AI(GitHub Copilot, Claude, Cursor 등)가 **작업 전에 반드시 따르는 규칙**입니다.
목표: 어떤 AI로 만들어도 **KT UX Design System(KDS) 2.0** 모양으로 모바일·PC 화면이 나오게 하는 것.

> **KDS가 정하는 것은 생김새다** — 색, 글꼴, 간격, 모서리, 컴포넌트(버튼·입력창·표·팝업…), 아이콘, 차트 색.
> **화면 구성·배치·기능은 정하지 않는다** — 무엇을 어디에 어떻게 놓을지는 요청한 사람의 아이디어를 따른다. 요청에 없는 화면 구조를 템플릿에 맞추려고 바꾸지 않는다.

> 키트가 프로젝트 안 하위 폴더(예: `kds/`)에 있으면, 이 문서의 `tokens/`·`icons/`·`templates/` 경로 앞에 그 폴더 이름을 붙인다 (`kds/tokens/kds-tokens.css`).
> KDS는 **2.0만** 씁니다. 인터넷에서 본 KDS 1.x 규칙·토큰 이름은 쓰지 마세요.
> 글꼴: 본문·버튼·폼은 **Pretendard**, 큰 제목만 **KT Flow**(`font-brand` 클래스). KT Flow는 해커톤 참가자 전용입니다.

## 0. 작업 순서

1. **화면 구성은 요청대로 자유롭게 짠다.** 출발점이 필요할 때만 `templates/`를 참고한다 (복사는 선택)
   - `mobile-task.html` 업무형 (납부·신청·변경·조회처럼 한 가지 일을 끝내는 화면)
   - `mobile-feed.html` 피드형 (홈·혜택·마이처럼 카드를 둘러보는 탭 화면, AI 화면)
   - `pc-page.html` PC (1280px 이상) 기본 / `pc-admin.html` PC 관리·목록 (요약 숫자·필터·표·차트·날짜·시간 선택)
2. **컴포넌트는 클래스로 붙인다** — `tokens/kds-components.css`의 `kds-*` 클래스(§3). 버튼·카드·입력창을 CSS로 새로 그리지 않는다.
3. 클래스로 안 되는 부분만 직접 CSS를 쓰고, 값은 **CSS 변수만** 쓴다(§4). 글자 크기·굵기는 CSS에 쓰지 말고 글자 클래스(`body-small-medium` 등)를 붙인다.
4. 완성된 예시가 필요하면 `examples/`를 본다.

`tokens/kds-tokens.css`(토큰 전체, 68KB)는 **열어서 읽지 않는다.** 자주 쓰는 토큰은 §4 표에 있다.

> 화면 확인은 반드시 로컬 서버로 연다(`python3 -m http.server 8000`, `npx serve .`, VS Code Live Server, Vite). 파일 더블클릭(file://)으로 열면 아이콘이 보이지 않는다 — 아이콘이 안 보인다고 아이콘을 글자·이모지로 바꾸지 말 것. 서버로 열어도 안 보이면 `--icon` 경로가 상대경로인지 본다(§5).

## 1. 절대 규칙

| 규칙 | 설명 |
|---|---|
| 하드코딩 금지 | `#191a1b`, `13px` 같은 값 대신 `var(--fill-primary)`, `var(--space-12)` |
| 버튼 기본색은 검정 | 결제·신청·확인도 `kds-button--primary`(검정). `kds-button--accent`(KT 레드)는 사용자가 요청했을 때만, 화면당 1개 |
| 색 비율 8:2 | 화면의 80%는 흰색·회색(배경·면·선), 20%만 포인트 색(검정 버튼·레드 포인트·teal 그래프). 포인트 색으로 넓은 면을 칠하지 않는다 |
| 빨강은 글자 강조에만 | 상태(미납·실패·에러), 할인율·등급·남은 횟수 같은 짧은 글자. 버튼·큰 면 금지. 표·비교의 최저가·최댓값을 빨강으로 강조하지 않는다(굵게만) |
| 빨간 테두리는 에러만 | `kds-field--error` 외에 쓰지 않는다 |
| 아이콘은 SVG | `<` `>` `X` 문자 금지. `icons/` 사용 (§5) |
| 팝업 버튼 순서 | 보조(취소) 왼쪽, 주요(확인) 오른쪽 |
| 보조 버튼 단독 금지 | `--secondary`는 항상 주요 버튼과 짝 |
| 장식 그림자·그라디언트 금지 | 그림자는 떠 있는 요소(팝업·시트·드롭다운)에만 |
| KT Flow는 제목에만 | display·heading 크기 제목에 `font-brand`. 본문·버튼·폼·표에는 쓰지 않는다 |

## 2. 화면 모양 (불러오기·구간은 필수, A~C 패턴은 참고)

**불러오기** (이 순서로 3개)
```html
<link rel="stylesheet" href="tokens/kds-tokens.css">
<link rel="stylesheet" href="tokens/kds-base.css">
<link rel="stylesheet" href="tokens/kds-components.css">
```
React/Vite: `main.tsx`에서 같은 순서로 `import`. Tailwind는 `bg-[var(--fill-primary)]`처럼 변수로.

**구간** — 전환점은 1280px 하나
| 구간 | 컴포넌트 | 좌우 여백 | 컬럼 |
|---|---|---|---|
| ~1279px | 모바일용 (`kds-topnav`·`kds-bottomnav`·`kds-sheet`) | 20 | 4 (768~ 8) |
| 1280px~ | PC용 (`kds-gnb`·`kds-breadcrumb`·`kds-pagination`) | 기본은 콘텐츠 최대 1080 가운데 (`kds-container`). 대시보드·지도·편집기처럼 넓게 써야 하는 화면은 전체 폭도 된다 | 12 |

아래는 **자주 쓰는 패턴 예시**다. 요청한 화면이 이 모양이 아니면 따르지 않아도 된다.

**A. 업무형** (기본 라이트 모드)
- 흰 바탕에 평평한 `kds-section`. 섹션 사이는 `<hr class="kds-divider-band">`(8px 회색 띠). **테두리 카드를 쌓지 않는다.**
- 상단 `kds-topnav`(뒤로 + 제목), 필요하면 아래에 `kds-info-band`(회선·상태 한 줄)
- 금액·값은 `kds-kv`(왼쪽 이름 / 오른쪽 값). 대표 금액만 `heading-medium-bold`로 크게
- 화면 끝 안내 링크는 `kds-list`, 하단은 `kds-cta-bar`(버튼 1개면 검정 풀 폭, 2개면 회색 왼쪽 + 검정 오른쪽)

**B. 피드형** (`<html data-mode="agent">` → 바탕 연회색, 카드 흰색)
- `kds-feed-section`(제목 + "더보기") 안에 `kds-feed-card`. (`--surface-primary-02`는 agent 모드에서 흰색이 된다 — 바꾸지 말 것) 가로로 넘기는 줄은 `kds-hscroll` + `kds-dots`
- 상단은 인사말 + 아이콘, 하단은 `kds-prompt-dock`(AI 입력) → `kds-bottomnav`

**C. PC** — `kds-gnb` → (`kds-breadcrumb`) → `kds-container` 안 콘텐츠 → `kds-footer`. 카드 목록은 `kds-grid` + `kds-card`

## 3. 컴포넌트 클래스 (`tokens/kds-components.css`)

사용법 예시는 각 클래스 바로 위 주석에 있다.
`docs/components/`의 `import … from "@BG002501-…"` 경로는 **설치할 수 없다** — 쓰지 말고 아래 클래스를 쓴다. docs는 props·변형 이름을 참고할 때만 본다.

| 무엇 | 클래스 |
|---|---|
| 버튼 | `kds-button` + `--primary`(기본) `--secondary` `--tertiary` `--accent` / 크기 `--xsmall`32 `--small`40 `--medium`44 `--large`48 / `--full` |
| 아이콘 버튼·글자 버튼 | `kds-icon-button`(aria-label 필수) · `kds-text-button` |
| 카드 | `kds-card`(테두리) · `kds-card--filled`(연회색) · 피드형은 `kds-feed-card` |
| 상태 태그 | `kds-tag` + `--info` `--progress` `--positive` `--warning` `--critical` `--complete` |
| 선택 칩 | `kds-chips` > `kds-chip` (선택 = `aria-pressed="true"`) |
| 입력창 | `kds-field` > `kds-field__label` · `kds-field__input` · `kds-field__helper` / 에러 `kds-field--error` |
| 선택 상자 (드롭다운) | `select.kds-field__input.kds-select` (선택지 4개 이하면 `kds-chip`·`kds-radio`) |
| 날짜 | `kds-datepicker` > `input.kds-field__input` + `<script src="tokens/kds-datepicker.js" defer>` / 기간은 `kds-date-range`로 두 개. **날짜를 칩·버튼 줄로 만들지 않는다** |
| 시간 | `kds-time-buttons` > `button.kds-time-button` (선택 = `aria-pressed="true"`, 마감 = `disabled`) |
| 표 | `kds-table-wrap` > `table.kds-table` (숫자 칸 `is-num`, 선택 행 `aria-selected="true"`). 표를 직접 그리지 않는다 |
| 검색 | `kds-search` (검색은 입력창으로 만들지 않는다) |
| 탭 | `kds-tabs` > `[role="tab"]` (선택 = `aria-selected="true"`) |
| 체크·라디오·스위치 | `kds-checkbox` · `kds-radio` · `kds-switch` (label 안에 input) |
| 카드형 선택 (쿠폰·요금제·옵션 고르기) | `kds-select-buttons`(2열 / `--3col` / `--list` 1열) > `label.kds-select-button` > `input` + `__title` + `__sub` |
| 목록·값 행 | `kds-list` (이동 링크) · `kds-kv` > `kds-kv__label` + `kds-kv__value` |
| 구분 | `kds-divider`(1px) · `kds-divider-band`(8px 띠) |
| 진행률 | `kds-progress` + `style="--value: 68%"` |
| 빈 상태 | `kds-empty` > `kds-empty__icon`(아이콘 SVG) + `kds-empty__text` — 이모지 금지 |
| 가로 스크롤 카드 | `kds-hscroll` > `kds-hscroll__item`(144) / `--wide`(200) |
| 알림 | `kds-toast`(확인 불필요) · `kds-overlay` > `kds-popup`(꼭 확인) · `kds-overlay--sheet` > `kds-sheet`(모바일, 선택지 3개 이상) |
| 모바일 | `kds-topnav` · `kds-info-band` · `kds-section` · `kds-cta-bar` · `kds-bottomnav` |
| AI | `kds-ai-mark`(✦) · `kds-ai-pill` · `kds-prompt-dock` (PC 패널 안에서는 `kds-prompt-dock--inline`) |
| AI 대화 | `kds-chat` > `kds-chat__user`(사용자 말풍선) · `kds-chat__answer`(AI 답변, 말풍선 없음) · `kds-chat__thinking`(추론 과정) |
| 표·목록 위 | `kds-result-count`(조회결과 **N**개) · `kds-info-line`(안내 한 줄, 오류는 `--error`) · `kds-notice`(안내 배너) |
| PC | `kds-gnb` · `kds-lnb`(왼쪽 메뉴 280) · `kds-breadcrumb` · `kds-pagination` · `kds-footer` / 팝업 작은 크기 `kds-popup--small`(400) |
| 레이아웃 | `kds-container`(최대 1080) · `kds-grid`(4→8→12컬럼) |

**자주 틀리는 마크업** — 이 모양 그대로 쓴다. `kds-*` 클래스를 페이지 CSS에서 다시 정의하지 않는다.
```html
<!-- 체크·라디오·스위치: 클래스는 label에, input은 그 안에 -->
<label class="kds-checkbox"><input type="checkbox"> 개인정보 수집에 동의합니다</label>

<!-- 입력창 -->
<label class="kds-field"><span class="kds-field__label">제목</span>
  <input class="kds-field__input" placeholder="제목을 입력하세요"></label>

<!-- 팝업: 열 때 kds-overlay에 is-open 추가, 닫을 때 제거 -->
<div class="kds-overlay" id="confirm"><div class="kds-popup" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
  <h2 class="kds-popup__title" id="confirm-title">등록할까요?</h2>
  <p class="kds-popup__body">등록한 문의는 수정할 수 없어요.</p>
  <div class="kds-popup__actions"><button class="kds-button kds-button--secondary">취소</button><button class="kds-button">등록</button></div>
</div></div>
<!-- document.getElementById('confirm').classList.add('is-open') -->

<!-- 토스트: is-open 추가 후 2~3초 뒤 제거 -->
<div class="kds-toast" role="status">등록했어요</div>
```

**선택 기준**
- 여러 항목 중 고르기: 짧은 글자 목록 → `kds-radio` / 이름+설명이 있는 카드 → `kds-select-button`. 직접 선택 카드를 만들지 않는다
- 선택지 2개 이하 + 짧은 메시지 → 팝업 / 3개 이상·긴 내용 → 모바일은 시트, PC는 팝업
- 한 목록 안에서 행 모양(이동·토글·값)을 섞지 않는다
- 필수 입력 전에는 주요 버튼 `disabled`

## 4. 토큰 (직접 CSS를 쓸 때만)

**글자** — `kds-base.css` 클래스를 붙인다
| 역할 | 모바일 | PC |
|---|---|---|
| 페이지 제목 | `heading-small-bold` 22 | `display-medium-bold` 36 |
| 섹션 제목 | `title-medium-bold` 18 | `heading-medium-bold` 24 |
| 카드 제목 | `title-small-bold` 16 | `title-large-bold` 20 |
| 본문 | `body-medium-medium` 15 · 목록 `body-small-medium` 14 | `body-large-medium` 16 |
| 캡션 | `caption-medium-medium` 12 | 같음 |

**색**
| 용도 | 토큰 |
|---|---|
| 화면 배경 / 카드·상단바 / 연회색 면 | `--background-default` / `--surface-primary-01` / `--surface-primary-02` |
| 글자 기본 / 보조 / 힌트 / 검정 위 글자 | `--text-primary` / `--text-secondary-01` / `--text-tertiary-01` / `--text-inverse` |
| 에러·강조 글자 | `--text-feedback-critical-01` |
| 선 / 입력창 테두리 / 포커스 | `--border-secondary-01` / `--border-primary-01` / `--border-primary-focused` |
| 검정 면 / 회색 면 / 비활성 | `--fill-primary` / `--fill-secondary-01` / `--fill-disabled-01` |
| 아이콘 | `--icon-primary` / `--icon-secondary-01` / `--icon-tertiary-01` |
| 차트·그래프 | 아래 **차트** 참고 |

**여백** `--space-2 4 6 8 10 12 16 20 24 32 40 48 56 64 80` 만 쓴다 (관례: 아이콘-글자 8 / 카드 안 20 / 요소 사이 12~16 / 섹션 사이 24~40)
**모서리** `--radius-4`(작은 버튼·태그) `--radius-8`(버튼·입력창) `--radius-12`(카드·팝업) `--radius-16`(시트 위) `--radius-20`(피드 카드) `--radius-circle`(칩·FAB만)
**그림자** `--shadow-1`(포커스) `--shadow-2`(드롭다운) `--shadow-3`(팝업)

**차트** — 그래프의 선·막대·도넛은 검정이 아니라 **teal 계열**로 그린다. teal은 **그래프 안에서만** 쓰는 보조 색이다(카드·칸·배경을 teal로 칠하지 않는다)
- 막대는 가늘게(폭 24~32) 간격을 넓게. 한 가지 값: `--data-visual-default-teal` / 강조 1개: `--data-visual-strong-teal` / 나머지·비교 기준: `--data-visual-default-gray`
- 여러 계열: teal → yellow → blue → purple 순서 (`--data-visual-default-*`). 단계 표현(적음→많음)은 `--data-visual-sequential-teal-1~4`
- 면 그래프·막대 그라디언트: `--gradient-graph-top-start` → `--gradient-graph-top-end` (차트 안에서만 허용되는 그라디언트)
- 차트는 흰 `kds-card` 안에 제목(`title-large-bold`) + 기간 선택(`kds-select`) + 범례(작은 원 + 글자)
- 예약·점유처럼 상태를 칸으로 보여줄 때: **얇은 막대(높이 8 이하)** 는 teal(찬 칸) / `--fill-secondary-01`(빈 칸)
- 방·좌석·카드처럼 **큰 칸** 은 칠하지 않는다 → 사용 중 = `--surface-primary-02`(연회색 면) + `kds-tag`(상태 글자), 빈 칸 = 흰색 + 테두리. teal·검정 면으로 채우지 않는다
- Chart.js 등 라이브러리는 색을 CSS 변수에서 읽어 넘긴다:
```js
const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const CHART_COLORS = ['teal', 'yellow', 'blue', 'purple'].map((c) => v(`--data-visual-default-${c}`));
```

## 4-1. 보기 좋게 만드는 기준 (디자이너 화면 실측)

화면 구성은 자유. 아래는 **생김새**만이다. 개발자·AI가 만든 화면을 디자이너가 고칠 때 반복해서 고치는 것들.

| 하지 말 것 | 이렇게 |
|---|---|
| 상자 안에 상자 (필터·안내·표를 큰 테두리 상자 하나에 몰아넣기, 카드 안 카드) | 면은 한 겹, 경계는 1px `--border-secondary-01` 한 줄. 섹션 제목은 카드 밖 |
| 모든 카드에 그림자 | 그림자는 떠 있는 것(팝업·드롭다운·입력창·토스트)에만 |
| 글자 크기를 18·22·28처럼 여러 개 | 한 화면 4~5단계: 32 제목 / 20·24 섹션·팝업 / 15·16 본문 / 13·14 보조 / 12 캡션. 위계는 **글자색**(`--text-primary` → `-secondary-01` → `-tertiary-01`)으로 |
| 칸·카드 속을 비우고 글자를 구석에 작게 | 한 덩어리에 대표 값 하나만 크게(굵게), 나머지는 회색 작은 글자 |
| 모든 항목에 태그 | 태그는 예외 상태에만 (정상·기본 상태엔 붙이지 않는다) |
| 간격을 12·16·20으로 고르게 | 안쪽 8·16 < 요소 사이 24 < 덩어리 사이 40 < 큰 구역 64. 바깥이 확실히 크게 |
| 화면을 꽉 채우기 | 폭을 고정하고 나머지는 비운다: 대화 748, 폼 932, 콘솔 1200, 왼쪽 메뉴 280 |
| 페이지 위 보조 동작(새로 만들기·내역)을 검정 버튼 | 테두리 버튼 `kds-button--tertiary`. 검정은 확정 동작 하나 |
| 왼쪽 메뉴 선택을 검정 면 | 연회색 면 + 검정 글자 (`kds-lnb`) |
| 오류·경고를 분홍·노랑 박스로 | 아이콘 + 빨간 글자 한 줄(`kds-info-line--error`). 필드 오류는 `kds-field--error` 하나만 |
| 빈 상태에 큰 그림·긴 설명 | 영역 가운데 회색 글자 한 줄(`kds-empty`) |
| 표 건수·페이지를 표 상자 안 구석에 | 표 위 `kds-result-count` → `kds-table` → 표 아래 40 가운데 `kds-pagination` |
| 팝업 버튼 폭 제각각 | 2개 같은 폭(취소 회색 / 확정 검정). 확인만 묻는 팝업은 `kds-popup--small` |
| AI 답변도 말풍선 | 사용자 말만 말풍선 `kds-chat__user`, 답변은 `kds-chat__answer`(줄높이 170%) |
| 순위 막대를 한 색으로 | 순위마다 차트 색 순서대로 (teal → yellow → blue → purple → red) |

## 5. 아이콘·이미지

```html
<span class="kds-icon" style="--icon: url(/icons/ic-line-search.svg)" aria-hidden="true"></span>
```
- **`--icon` 주소는 서버 루트 기준 절대경로**로 쓴다 (키트 폴더를 그대로 열었으면 `url(/icons/…)`, 프로젝트의 `kds/`면 `url(/kds/icons/…)`). 상대경로(`icons/…`, `../kds/icons/…`)는 페이지가 아니라 `kds-base.css`(tokens/) 위치 기준으로 풀려 서버로 열어도 아이콘이 사라진다. 키트 안 `templates/`·`examples/`의 `../icons/`만 우연히 맞는다.
- `ic-line-*` 기본, `ic-fill-*` 선택된 상태(하단 탭 등). 크기 기본 24, `kds-icon--20`, `kds-icon--16`. 색은 `color`로.
- 자주 쓰는 것: `chevron_left`(뒤로) `chevron_right` `close` `search` `menu` `alarm` `home` `my` `setting` `info` `check`. 전체 목록은 `icons/` 폴더.
- **키트에 없는 아이콘**은 Lucide(lucide.dev) 아이콘으로 대신한다. KDS 라인 아이콘과 같은 모양(선 두께 2, 둥근 끝)이라 섞여도 어색하지 않다. Lucide는 KDS보다 약 10% 커 보이므로 **24 자리 안에 22 크기로** 그린다(코드는 `kds-icon kds-icon--lucide` 클래스, 피그마는 24 프레임 가운데에 22로 배치). 색은 `--icon-primary` 같은 아이콘 토큰, 코드에 `/* KDS 아이콘 없음: Lucide <이름> */` 주석. 글자(`<` `>` `X`)나 이모지는 쓰지 않는다.
- KT 로고 `images/logo_kt.svg`. 회색 빈 박스를 이미지 자리로 남기지 않는다.

## 6. 완료 전 체크

- [ ] CSS에 `#`로 시작하는 색, 토큰 아닌 px 값이 없다
- [ ] 주요 버튼이 검정이다 (레드는 요청받았을 때만 1개)
- [ ] 버튼·카드·입력창이 `kds-*` 클래스다
- [ ] 모바일에 PC 전용, PC에 모바일 전용 컴포넌트가 없다
- [ ] 업무형은 평평한 섹션 + 8px 띠, 피드형은 `data-mode="agent"` + 흰 카드
- [ ] 아이콘은 SVG, 아이콘 버튼에 `aria-label`
