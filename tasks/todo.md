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

## #8 추천 결과 선택·수정과 확정 — PLANNER (dev:2)
완료 조건: AC-08.1~08.3을 시험 자료와 함께 done 처리하고 `npm run check` 통과 뒤, #7 병합 후 origin/main을 merge해 `Closes #8` PR.
- [x] 일정 목록·수정·확정 API와 pytest(`407507f`·`02139fe`): 위반 있는 초안 저장, 위반 시 확정 409, 이전 확정 superseded
- [x] 초안 빼기·바꾸기·확정 화면, 일정 탭 확정 계획(`169595e`)
- [x] E2E TC-47~49(`tests/plan.e2e.ts`, edu-dev2b): 11:2xZ 3회 연속 3/3, `schedule.e2e.ts` 4/4
- [x] #7 병합(`f5e3edd`) 뒤 origin/main merge, `npm run check` exit 0(api 209·web 19), AC-08.1~08.3 done, lessons
- [ ] PR(`Closes #8`) → CI 3/3 → VERIFIER 승인 → 병합
## #12 모두의 AI 교육 에이전트 표현과 연동 경계 — BUILDER (10:32 분배 조정으로 dev:2→dev:1)
- 완료 조건: AC-12.1·12.2 done(TC-67·68), `npm run check`·`npx e2e run` 통과, `Closes #12` PR VERIFIER 승인
- [x] 라벨 #12·#4 dev:2→dev:1
- [x] `GET /api/meta` 고정 문구(AD-14 모의 경계), `test_meta`(앱 생성 전 합성 Azure 값, 호스트 0건), 501 목록에서 제외, `gen:api`
- [x] `tests/branding.e2e.ts` TC-67·68 — 앱 기동 전 합성 `AZURE_OPENAI_ENDPOINT`, 없으면 TC-68 실패 확인. CI e2e env에 합성 값
- [x] arch 분배 문장 3곳(별도 커밋, BUZZ 04c89f41)
- [ ] AC-12.1·12.2 done, development.md, PR
