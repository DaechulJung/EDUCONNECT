
## 2026-10-10 - [BUILDER] 기준선 검증 시 3000·8000·15432·16379 포트가 다른 프로젝트에 점유될 수 있음
- 상황: 같은 PC에서 resident-parking-ai 컨테이너가 3000/8000/15432/16379를 쓰고 있어 기본 포트로 띄우면 충돌하거나 `curl localhost:3000`이 다른 앱에 응답할 수 있었다.
- 조치: 다른 프로젝트 컨테이너는 멈추지 않고, `DB_PORT=25432 REDIS_PORT=26379`(+ `DATABASE_URL`·`REDIS_URL`)와 저장소 밖 compose override(`ports: !override`로 web 13000, api 18000)를 쓰고 `APP_URL=http://localhost:13000`으로 E2E를 돌린다.
- 규칙: health·E2E 전에 `lsof -iTCP:3000,8000 -sTCP:LISTEN`으로 대상이 이 프로젝트 컨테이너인지 먼저 확인한다.

## 2026-10-10 - [PLANNER] research standard: 5/5 레인, ok 86 (docs/intent.md, draft)
- 문제·원인: 종합에서 "학원 검색과 일정 관리를 잇는 서비스는 확인되지 않음"이라고 썼으나, L5 레인이 받은 런즈 App Store 원문 설명에 두 기능이 함께 있었다. 레인 결론(L3)을 그대로 옮기고 다른 레인 원문을 경쟁 서비스 관점으로 다시 찾지 않았다. 검토 지적 10건 중 나머지도 조건 탈락(대상·사용처·이전 서버 기준)이었다.
- 교훈: '미확인' 재검색은 노트의 미확인 항목뿐 아니라 결론의 부재 문장("~는 확인되지 않음")에도 해야 한다.
- 다음에 적용할 것: 종합 전에 결론 문장의 부재 주장마다 핵심어로 `ledger.mjs search`를 모든 레인 원문에 돌린다.

## 2026-10-10 - [PLANNER] W2-P intent 확정 → brief final → prd final (확인 지점 A 대기)
- 문제·원인: 연습용 양식이 `[…]` 자리표시자를 써서, 제목을 채우면 `doc check`가 실패했다(하네스는 `<…>`·`{…}`만 자리표시자로 인식). 반복 제목(REQ-01)은 번호까지 자리표시자여야 반복이 허용된다. 양식 적용 단계의 검사가 '양식 자체'만 보고 '채운 표본'을 검사하지 않았다.
- 교훈: 양식을 받으면 첫 문서를 쓰기 전에 제목·반복 제목을 채운 표본 하나로 `doc check`를 먼저 돌린다. AC는 첫 초안에서 이미 '전제·입력·관찰값' 세 요소를 한 줄에 넣어야 rubric 재작성이 줄어든다(이번 high 10건 중 대부분이 이것).
- 다음에 적용할 것: brief 착수 전 표본 doc check, PRD 초안은 AC 행마다 전제/입력/관찰값 체크 후 리뷰에 넘긴다.

## 2026-10-10 - [PLANNER] CHG-002 → arch final → 기반 #14·분배
- 문제·원인: 첫 arch 초안은 AD 문구만 지키면 두 개발자가 서로 다르게 만들 여지가 12곳 있었다(여러 요일 프로그램의 월 학원비 중복 합산, 4xx 본문에 완화 조건을 실을 자리 없음, 404 감사 기록 누락 경로, JSON 열 모양 미정 등). 규칙을 "누가 쓰나"까지만 정하고 "무슨 모양으로 쓰나"를 AC와 대조하지 않았다. register.json 재생성은 prd 버전이 바뀌면 `source register`를 먼저 해야 통과한다.
- 교훈: 공유 데이터 열·오류 봉투·집계 단위는 AC 문장(금액 합·주 횟수·완화 조건)과 한 줄씩 대조해 AD에 키·단위까지 적는다. 적대적 리뷰어 지적이 대부분 여기서 나왔다.
- 다음에 적용할 것: arch 초안 직후 "AC별로 필요한 응답 필드·열" 표를 스스로 한 번 만들고 리뷰를 돌린다. prd를 고친 뒤에는 `source register` → register --dry-run 순서.

## 2026-10-10 - [PLANNER] CHG-003 register
- 교훈: `source register`의 `--prd`는 register.json의 document.id(`educonnect-prd`)여야 한다. 다른 값을 쓰면 새 캐시가 생기고 dry-run이 "원문 버전과 근거가 다릅니다"로 실패한다. register.json 안의 sourceRefs version도 새 prd sha256으로 바꾼다.

## 2026-10-10 - #14·#11 병합 후 검증, PR #16 검토 [VERIFIER]
- 문제·원인: (1) #14 기본 compose 기동 실패(LLM_PROVIDER·ENABLE_TEST_ROUTES 빈 문자열)는 CI가 두 값을 지정해 가려져 있었다. (2) PR #16 승인을 BUZZ에만 남기고 PR 코멘트를 쓰지 않아, 병합 조건(`VERIFIER 승인` 코멘트)이 기록 없이 지나갔다. (3) 진행 보고에 "#1 TC 준비 완료"라고 먼저 쓰고 준비 문서를 나중에 채웠다.
- 교훈: CI 설정과 README 기본 명령은 따로 재현해야 한다. 승인은 PR 코멘트가 기록이고 BUZZ 메시지는 알림이다. 완료 표현은 산출물이 생긴 뒤에만 쓴다.
- 다음에 적용할 것: 검토마다 무환경 기동과 README 명령을 한 번씩 실행한다. 승인 시 `gh pr comment <PR>`에 `VERIFIER 승인`·head SHA·확인 항목·원자료 경로를 먼저 남기고 BUZZ에 알린다. 승인 전 Codex 지적별 처리 코멘트를 확인한다.

## 2026-10-10 - #5 챗봇 조건 설정·확인·수정 [PLANNER]
- 문제·원인
  - AC-05.3·05.4가 #6 추천·#7 일정 생성을 써서 `Closes #5`로 닫을 수 없었다(선행 순환). AC를 쓸 때 뒤 Issue의 기능을 확인 단계에 넣었다.
  - TC-34가 키가 있어도 `source=fallback`. 키 파일의 `AZURE_OPENAI_BASE_URL`이 끝 '/' 없이 `/openai/v1`이라 설정 검사가 막았다.
  - api 접근 로그마다 `TypeError: cannot unpack`. 로그 가림 필터가 `record.args=None`으로 지워 uvicorn 접근 포맷터가 튜플을 풀지 못했다. 시험은 통과해서 로그를 보기 전까지 몰랐다.
  - `npm run check`가 compose 프로젝트 이름 없이 `dev2`로 db·redis를 띄워 `edu-dev2`와 포트가 겹쳤다.
- 교훈
  - AC의 확인 단계는 그 Issue가 만드는 기능 안에서 끝나야 한다. 뒤 Issue 기능이 필요하면 그 Issue의 AC로 둔다(CHG-004·005).
  - 외부 설정값은 사람이 포털에서 복사한 모양(끝 '/' 유무)을 그대로 받아들이게 정규화하고 시험한다.
  - 공용 로깅 필터는 실제 포맷터(uvicorn AccessFormatter)로 형식화까지 시험한다.
- 다음에 적용할 것
  - PRD AC를 쓸 때 "이 문장을 이 Issue 코드만으로 확인할 수 있나"를 Issue 분배 전에 점검한다.
  - E2E 뒤 api 로그의 Traceback 수를 확인한다.
  - `npm run check`는 `COMPOSE_PROJECT_NAME=edu-dev2`로 실행한다.
