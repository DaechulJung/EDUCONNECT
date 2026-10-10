## 레인 상태 (PLANNER, 세션이 끊기면 여기서 이어받는다)
- dev2-ui · `fix-parent-width` · PR #27 VERIFIER 승인 → 병합 `898ea4e`(13:3xZ). 남은 일 없음(병합 후 검증·TC-40은 VERIFIER)
- dev2-ui · `fix-chat-loading` · PR #31 VERIFIER 승인 → 병합 `aec2f3f`. 남은 일 없음([관찰] 성공 뒤 재조회 실패 시 보내기 막힘 — 후속 판단 대기)
- dev2-9 · `issue-9` · PR #29 결함 5건 RED→GREEN, main `aec2f3f` merge → 다음: 최종 check·E2E → push·답글 4곳·VERIFIER

## #6 프로그램 추천·비교 — PLANNER (dev:2)
완료 조건: AC-06.1~06.7을 시험 자료와 함께 done 처리하고 `npm run check`·E2E 통과 뒤 `Closes #6` PR. AC-06.4 전제로 #4의 `PUT /api/children/{id}`만 먼저 구현(10:13 결정, AC-04.x는 #4).
- [x] 추천 API `POST /api/recommendations`(엔진 후보 필터·정렬 위) — `0ad1b81`
- [x] 자녀 수정 PUT(소유권 `_own_row` 공유·404 감사·401·동의 422·모르는 필드 422·응답에 실명 없음) — `223013b`
- [x] 시드 기반 API 시험(AC-06.1·06.3·06.4·06.5·06.6·06.7) — `bfb0e4d`
- [x] '추천 보기'·비교표 화면(768px 이상 표, 미만 카드) — `3e83883`
- [x] E2E TC-35~39·80 — `30caebc`
- [x] origin/main `5f12264` 병합(`fe804e1`) 후 `npm run check`(api 191·web 9)·E2E 17/17
- [x] AC-06.1~06.7 done, development.md #5·#6, lessons, PR
- [x] Issue #4 코멘트에 PR 링크(PR #19)

## #7 주간 일정 생성·최적화 — PLANNER (dev:2)
완료 조건: AD-5·AD-6·AD-7 순수 함수 엔진과 단위 시험(`apps/api/tests/test_engine.py`). #11 병합 뒤 시드 기반 시험으로 바꾸고 AC-07.1~07.8을 done 처리한 뒤 `Closes #7` PR.
- [x] travel.py (하버사인·보정 1.4·15km/h·최소 5분·같은 위치 0분) — issue-7 `8ed4441`
- [x] engine.py 후보 필터(학년·과목·유형·요일·정원·미공개) — `8ed4441`
- [x] engine.py 검증(time_overlap·travel_short·over_budget) — `8ed4441`
- [x] engine.py 일정 생성(결정형 탐색, 촘촘 공백 ≤30, 완화 조건) — `8ed4441`
- [x] engine.py 추천 정렬(점수, 학원명, 시작 시각, ID) — `8ed4441`
- [x] 단위 시험 TC-41·42·43·44·46 고정 입력 초안(14개) — `8ed4441`
- [x] 고정 입력을 #11 시드(`apps/api/app/seed/data/`)로 교체 — `41d4254`
- [x] AC-07.7 재생성 시험 TC-78(CHG-004) `41d4254`, AC-07.8 E2E TC-79(CHG-005) `f1863b9`
- [x] 일정 API(`c2a0394`)·화면(`f1863b9`), `npm run check` api 197·web 16, E2E 22/22, AC-07.1~07.8 done, PR

## #5 챗봇 대화로 조건 설정과 화면 확인·수정 — PLANNER (dev:2)
완료 조건: AC-05.1~05.7을 시험 자료와 함께 done 처리하고 `npm run check` 통과 뒤 `Closes #5` PR. AC-05.3·05.4는 CHG-005 문장(새 대화에 값 유지)대로 시험.
- [x] 조건 추출(LLM·규칙 대체)·자녀별 조건 저장·조회 API — `63aa9cb`
- [x] 챗봇 화면(조건 카드·수정 시트·저장) — `9481b49`
- [x] 자기 자녀 목록 `GET /api/children` — `8d1b085`
- [x] E2E TC-28·29·32·33 — `58f5f93`·`fac0be6`·`dd5b412`
- [x] #11 시드 병합(`dfa3adc`), Azure 주소 끝 '/' 보정(#14 후속 `9a7350c`)
- [x] TC-34(AC-05.7, 실제 Azure, `ai` 태그) 실행
- [x] CHG-005 병합 후 TC-30·31을 새 대화 유지 확인으로 맞춤
- [x] `npm run check`(api 153·web 8, `6c9d4df`), AC-05.1~05.7 done, lessons, PR
- [x] 접근 로그 TypeError — 가림 필터가 uvicorn 인자 튜플을 지움(#14 후속 `a2636a5`)
## #1 로그인·권한·감사 — BUILDER
- 완료 조건: AC-01.1~01.13 모두 done(TC-01~12·76), `npm run check`·`npx e2e run` 통과, `Closes #1` PR VERIFIER 승인
- [x] `8d1b085`(#5 자녀 목록) cherry-pick 후 `get_own`·`GET /children/{id}`만 추가(남의 자녀·없는 자녀·잘못된 id 모두 404)
- [x] catalog 소유 수정 API(학원 프로그램·방과후·학교 시간표 조회/수정) — 화면은 #2·#3
- [x] API 시험: test_auth(TC-06~09·11·12), test_authz(TC-03~05), test_audit(TC-76)
- [x] E2E: tests/auth.e2e.ts(TC-01·02·10), workers 1(공유 시드 reset)
- [x] origin/main(CHG-005·작업 기록) merge 후 재시험
- [x] AC-01.1~01.13 done 기록, PR

## #11 시드 데이터 — BUILDER (병합 78c32bd, 사후 기록)
- 완료 조건: AC-11.1~11.4 done(TC-63~66), `Closes #11` PR 병합
- [x] 시드 JSON·`npm run seed`·`--reset`(EDUCONNECT 전용 DB 확인)
- [x] #14 후속: Settings `env_ignore_empty`
- [x] PR #16 리뷰 반영(루트 .env, reset 순서, CI SEED_PASSWORD)

## #2 학원 프로그램 등록·관리 — BUILDER
- 완료 조건: AC-02.1~02.6 done(TC-13~18), `npm run check`·`npx e2e run` 통과, `Closes #2` PR VERIFIER 승인. AC-02.4·02.5·02.6의 추천·일정 쪽 확인은 #6·#7 병합 뒤
- [x] 프로그램 목록·등록·삭제(soft delete) API와 시험(AC-02.3)
- [x] 학원 화면: 목록(미공개 표시)·등록 폼(칸 옆 오류)·삭제 확인
- [x] 화면 단위 시험(program-form)·E2E(TC-13·14·17·18 학원 쪽) — academy.e2e 3/3 (`8bdb38e`)
- [x] origin/main(#1 병합 678efad) merge 후 재시험 — `npm run check` api 140·web 7
- [x] origin/main(#6 병합 e60a712) merge, TC-16·17(목록·비교표)·18 E2E — academy 5/5, 전체 E2E 23/23(ai 태그 제외), `npm run check` api 197
- [x] PR #17 이월 3건: lessons #14 `[BUILDER]`, TC-07 근거에 session.test.ts, TC-76 가짜 Azure 값을 앱 생성 전에 주입
- [x] TC-17 일정 확인: 로컬 시험 브랜치(issue-2 + origin/issue-7, push 안 함)에서 먼저 작성·실행
- [x] #7 병합 → origin/main merge → TC-17 전체 재실행 → AC-02.5 done → `Closes #2` PR (#2 blocked-by #7 등록) — main `0994677` merge, E2E 29/29
## #8 추천 결과 선택·수정과 확정 — PLANNER (dev:2)
완료 조건: AC-08.1~08.3을 시험 자료와 함께 done 처리하고 `npm run check` 통과 뒤, #7 병합 후 origin/main을 merge해 `Closes #8` PR.
- [x] 일정 목록·수정·확정 API와 pytest(`407507f`·`02139fe`): 위반 있는 초안 저장, 위반 시 확정 409, 이전 확정 superseded
- [x] 초안 빼기·바꾸기·확정 화면, 일정 탭 확정 계획(`169595e`)
- [x] E2E TC-47~49(`tests/plan.e2e.ts`, edu-dev2b): 11:2xZ 3회 연속 3/3, `schedule.e2e.ts` 4/4
- [x] #7 병합(`f5e3edd`) 뒤 origin/main merge, `npm run check` exit 0(api 209·web 19), AC-08.1~08.3 done, lessons
- [x] PR #23 병합(`fca1e24`) — 관문 누락(VERIFIER PR 코멘트·Codex 처리 코멘트 없음)으로 다시 열기(결정 `b9c2c418`)
- [x] Codex P1: `update_draft` 자녀 행 잠금 + 결정형 경합 시험 — `9084ff1`
- [x] Codex P2: 확정 409 위반 갱신·422 신청 불가, web 시험 2 — `063ba5a`, experience State Patterns 1행 — `0c93870`
- [x] Codex P2(plans.py 230) 부분 반영, 한계 development.md 기록. check api 210·web 21, gen:api 0, E2E 27/27
- [x] PR #24 Codex P1: E2E `#8 회귀 확정 409`·`#8 회귀 확정 422`(`tests/plan.e2e.ts`) — main 판 web으로 RED 2 실패 확인
- [x] PR #24 Codex P1: lessons `#8 다시 열기(PR #23 Codex 후속)`
- [x] PR #24 Codex P2: 409 뒤 예산 초과 금액은 응답 `amount`, 안내는 위반 종류별(`confirmNotice`) + web 시험 2
- [ ] PR #24 처리 코멘트 → VERIFIER PR 승인 코멘트 → CI 3/3 → `--match-head-commit` 병합
## #12 모두의 AI 교육 에이전트 표현과 연동 경계 — BUILDER (10:32 분배 조정으로 dev:2→dev:1)
- 완료 조건: AC-12.1·12.2 done(TC-67·68), `npm run check`·`npx e2e run` 통과, `Closes #12` PR VERIFIER 승인
- [x] 라벨 #12·#4 dev:2→dev:1
- [x] `GET /api/meta` 고정 문구(AD-14 모의 경계), `test_meta`(앱 생성 전 합성 Azure 값, 호스트 0건), 501 목록에서 제외, `gen:api`
- [x] `tests/branding.e2e.ts` TC-67·68 — 앱 기동 전 합성 `AZURE_OPENAI_ENDPOINT`, 없으면 TC-68 실패 확인. CI e2e env에 합성 값
- [x] arch 분배 문장 3곳(별도 커밋, BUZZ 04c89f41)
- [ ] AC-12.1·12.2 done, development.md, PR
## 보호자 폭 결함(표 모양·상단 제목·E2E 폭) — PLANNER 하위 레인 (#6 AC-06.1, #7 AC-07.1 다시 열기)
완료 조건: 표 모양을 들어 있는 틀의 실제 폭으로 고르고(보호자 폰 틀 안에서는 항상 카드·요일 목록), 390px 상단 제목이 잘리지 않으며, 보호자 E2E는 390×844·기관 E2E는 1280 폭으로 돈다. 재현 E2E RED → GREEN, `npm run check`·전체 E2E(`--exclude-tag ai`) 통과, `Closes #6`·`Closes #7` PR.
- [x] #6 AC-06.1·#7 AC-07.1 다시 열기(kode CLI)
- [x] 폭 설정(보호자 390×844, 기관 1280×720)과 재현 E2E(1440 넘침·390 제목) 작성, 수정 전 코드로 RED 확인(`.scratch/red/`)
- [x] 틀 폭 측정 훅(ResizeObserver)으로 RecommendTable·PlanDraft 모양 결정, 상단 제목 수정 → GREEN
- [x] 영향받은 보호자 E2E 선택자(비교표 카드·요일 목록) 수정
- [x] gen:api 차이 0, `npm run check`, 전체 E2E(390·1440은 parent-width E2E로 측정)
- [x] TC-49 안쪽 확정 계획 이름(자녀 이름 전 '자녀') — VERIFIER 12:32Z
- [x] 추천 이유 코드값(`tight`) → 라벨(`9769eb9`) — 정대철_테스트 12:38Z 지시 결함 2
- [x] AC-06.1·AC-07.1 done(E2E 42/42 `9a082f9`), development.md·lessons, PR
## #3 학교 정규·방과후 시간표 등록·관리 — BUILDER
- 완료 조건: AC-03.1~03.4 done(TC-19~22), `npm run check`·`npx e2e run` 통과, `Closes #3` PR VERIFIER 승인. AC-03.2(일정)·03.3(추천)은 #6·#7 병합 뒤
- [x] 방과후 목록·등록·삭제 API, 같은 학년·요일 겹침 422 `time_overlap`(AC-03.4) — `test_after_school.py`
- [x] 학교 화면: 학년별 하교 시각·방과후 목록·등록 폼(겹침은 칸 옆 "시간이 겹칩니다")
- [x] E2E TC-19·22 (`188df37`)
- [x] main `de8e2e8`(#6·#7 포함) merge 뒤 TC-20·21 — school 4/4 (`4112287`)
- [x] main `0c0f143` merge, gen:api 일치, `npm run check` api 224·web 36, E2E 38/38 → AC-03.1~03.4 done → `Closes #3` PR
- [ ] PR #27 Codex P2 (가)(13:04Z 결정 78b98fbf): 768 이상 틀 748 가운데, 표 판정 뷰포트 768, experience 132행 "(최대 748px)"
  - [x] 768×1024·1440×900 회귀 E2E(표·7열 격자, 넘침 0, 시각·금액 한 줄) `77959fd`에서 RED(카드·요일 목록, 틀 480)
  - [x] 틀·판정 수정(`aa54544`)·experience 132행(`7607d1e`)·main `02b2096` 병합 → GREEN
  - [x] 최종 head `1b50d4b` check(api 242·web 47)·gen:api 0·E2E 48/48·links 0, push, Codex P2 답글(r4237682509), VERIFIER
## #4 자녀 정보 등록 — BUILDER (10:32 분배 조정으로 dev:2→dev:1)
- 완료 조건: AC-04.1~04.5 done(TC-23~27), `npm run check`·`npx e2e run` 통과, `Closes #4` PR VERIFIER 승인. TC-24·27은 #7 병합 뒤
- [x] `POST /api/children`(14세 미만 동의 확인, 실명·연락처 거부) — #6 PUT·`get_own` 공유
- [x] `GET /api/catalog/schools` 보호자 전용 401·403, 이름순(9aa773ce 결정), arch 2곳 별도 커밋
- [x] 자녀 탭 목록·등록 시트, TC-23(school_id 대조)·25·26 E2E
- [x] TC-24 토 기존 일정 배치 E2E(#7 병합 뒤)
- [x] AC-04.5: 422 `school_timetable_missing`, reset `omit_timetable`, DismissalForm, pytest·web 단위·TC-27(8fe841de 결정)
- [x] main `de8e2e8` merge(evidence.json 합집합) 뒤 check api 230·web 33, E2E children 5/5
- [x] 문서: arch 233·237행, experience 85·169행, development.md #4 행·한계 1줄
- [ ] AC-04.5 done → `Closes #4` PR → CI 3/3 → VERIFIER 승인 → 병합

## 챗봇 자녀 목록 불러오는 중 결함(`fix-chat-loading`, Refs #5) — PLANNER dev2-ui
완료 조건: 목록을 받기 전에는 보내기 비활성 + "처리하고 있어요", "먼저 자녀를 등록해 주세요"는 0명일 때만, 오류는 오류 문구. 재현 E2E RED → GREEN, `npm run check`·전체 E2E 통과, development #5 행 1줄, PR → VERIFIER (12:48Z 지시 0685a4bf)
- [x] 회귀 E2E `#5 회귀 자녀 목록 불러오는 중`(`03be12b` 초안) — `9589179` 코드에서 RED(97행 안내 문구 보임)
- [x] `childGate`(불러오는 중·오류·0명·자녀 있음) + 보내기·추천 질문 비활성, 오류는 experience 100행 문구 — `55fd75a`, GREEN 5/5 ×2
- [x] development #5 행·lessons(`403ba02`, check api 240·web 45·E2E 46/46)
- [ ] main `898ea4e` merge 뒤 check·전체 E2E, PR, VERIFIER

## 문서·코드 대조 1군(PR C `fix-plan-ux`, PR D `fix-plan-travel`) — PLANNER dev2-ui (13:56Z 지시 2a5bc50c)
레인: dev2-ui · `fix-plan-ux` → PR C 뒤 같은 레인에서 `fix-plan-travel`(07-1)
- [x] PR C 회귀 시험 main `aec2f3f`에서 RED(pytest 1·vitest 4·E2E 4) — `7eab245`
- [x] 05-2 빈 요일 월~금(api `1cc0d7e`), 05-6·07-4·07-5·08-3·childGate(web `b9128fa`) — plan-ux E2E 4/4
- [ ] PR C: check·전체 E2E, PR, VERIFIER
- [ ] PR D 07-1: 계획 항목 이동 값 API·gen:api·주간 일정표 "이동 N분(근사)", 회귀 RED 먼저

