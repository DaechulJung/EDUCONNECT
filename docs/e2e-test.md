---
status: draft
---
> 연습용 임시 양식 — 주최 측 양식 미제공. 온보딩 개발 문서 안내 기준으로 팀이 작성했으며 주최 양식을 받으면 교체한다.

# 시험 계획과 결과: EDUCONNECT

## 1. 준비

### 1.1 환경

- 운영체제: macOS(로컬 검증), Linux(GitHub Actions CI). 런타임: Node.js 24, Python 3.14(uv), PostgreSQL(pgvector 이미지)·Redis(compose). 브라우저: 하네스 `e2e` 러너의 Playwright 엔진(Chromium). 보호자 화면은 모바일 폭, 기관 화면은 데스크톱 폭(intent 17장).
- 포트: main 공유 트리 WEB 13000 · API 18000 · DB 25432 · REDIS 26379. 개발 worktree는 dev1 13001/18001/25433/26380, dev2 13002/18002/25434/26381. E2E는 `APP_URL`로 대상 주소를 정한다.
- AI: 기본 시험과 CI는 LLM 대역. 실제 Azure OpenAI는 `ai` 태그 시험(TC-34)만 로컬에서 실행한다. 설정 변수 이름: `AZURE_OPENAI_LOCATION`·`AZURE_OPENAI_ENDPOINT`·`AZURE_OPENAI_BASE_URL`·`AZURE_OPENAI_API_KEY`·`AZURE_OPENAI_DEPLOYMENT`. 값은 저장소 밖 파일에만 있고 이 문서·시험 코드·근거에 적지 않는다. 비밀 노출 시험(TC-57·58·61)은 실제 값이 아닌 시험용 가짜 값을 쓴다.

### 1.2 합성 데이터

- 시드: 학교 2곳(초등 1·중학교 1, 학년별 정규 시간표·방과후), 학원 5곳(영어·수학 중심 + 예체능·기타 1개 이상, 미공개 1·마감 1·중1 전용 수학 포함), 시드 계정(보호자 2·학원 담당자 2·학교 담당자 2), 데모 자녀 2명(초5·중1). 실제 개인정보는 쓰지 않는다(intent 10·17장, PRD REQ-11).
- 시험마다 시드 초기화로 시작한다. 초기화 명령과 시드 파일 위치는 REQ-11(#11) 구현 PR에서 정해지면 1.3에 적는다.
- 기준 시나리오: 초5, 영어·수학, 목표 월 1,000,000원·상한 1,100,000원, 밀도 촘촘하게(PRD SM-3, 성공 기준 ③).

### 1.3 명령

| 단계 | 명령 | 비고 |
| --- | --- | --- |
| 설치 | `npm install && uv sync --directory apps/api` | KT 망에서는 `uv sync --native-tls` |
| 빌드 | `npm run build` | 웹 빌드. 컨테이너 전체는 `npm run up` |
| 실행 | `npm run up` | compose 포트 환경변수화(첫 기반 PR) 전까지는 저장소 밖 override 파일 사용 |
| 단위시험 | `npm run check` | infra·migrate·lint·typecheck·vitest·pytest. API 개별 파일은 `uv run --directory apps/api pytest tests/<파일>.py` |
| E2E | `APP_URL=http://localhost:13000 npx e2e run` | 파일 지정 가능. 보고서 `.e2e/report.json` |
| 종료 | `npm run down` | - |
| 정리 | 시드 초기화 명령(REQ-11 구현 후 확정) | 시험 데이터 초기화. 현재 미확정 |

## 2. 범위

| 유형 | 대상 | 이유 |
| --- | --- | --- |
| 단위 | 일정 엔진 판정(중복·예산·이동·밀도·결정성), 시드 구성·초기화 | intent 17장: 판정 규칙은 단위 시험. 성공 기준 ②③을 결정형으로 확인 |
| API | 인증·세션·잠금, 역할·소유권 거부, 서버 입력 검증, 추천 결정성, 비밀값 마스킹·https 강제 | 화면으로 관찰할 수 없는 상태 코드·쿠키·DB 불변·로그를 확인 |
| E2E | FLOW-01~05와 화면 확인 조건, 접근성(axe·키보드) | intent 17장: 화면 흐름은 E2E(하네스 `e2e` 러너) |
| 검사 | 웹 빌드 산출물·응답의 설정값, `.env.example`, 저장소 추적 파일 비밀값 | SEC-01·11. 저장소 검사 패턴은 시험 스크립트에만 둔다 |
| E2E(ai) | 실제 Azure OpenAI 조건 추출 1건 | D-15: 로컬에서만 실행·기록 |

## 3. 관찰 관점

모든 시험은 해당하는 관점을 절차와 기대 결과에 포함한다.

| 관점 | 확인 내용 |
| --- | --- |
| 정상 | 입력에 대한 화면 표시와 응답 값 |
| 오류 | 잘못된 입력의 거부 문구와 저장되지 않음 |
| 권한 경계 | 다른 사용자 구분의 접근 거부와 변경 없음 |
| 저장 후 재조회 | 저장 뒤 새로 불러왔을 때 같은 값이 보임 |

## 4. 시험 표

판정은 PASS·FAIL·SKIP·미실행·미검증·비해당 중 하나다. 실행 출력을 확인한 시험만 PASS·FAIL을 쓴다. SKIP·미검증·비해당은 근거 열에 이유를 적는다. 근거 열에는 `docs/evidence/e2e-doc/` 아래에 시험 ID를 파일 이름으로 쓴 근거 파일 경로를 적는다.

| 시험 ID | 확인 조건 | 흐름 | 유형 | 전제·초기 데이터 | 절차(GIVEN·WHEN·THEN) | 기대 결과 | 실제 결과 | 실행 명령 | 시험 코드 | 소스 SHA | 실행 시각 | 판정 | 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-01 | AC-01.1 | FLOW-04 | E2E | 시드 초기화 후 시드 계정 3종 | GIVEN 로그인 화면 WHEN 보호자·학원 담당자·학교 담당자 계정으로 각각 올바른 비밀번호 입력 THEN 역할별 첫 화면 확인 | 보호자 챗봇 홈·학원 프로그램 관리·학교 시간표 관리 화면이 각각 열림 | - | `APP_URL=http://localhost:13000 npx e2e run tests/auth.e2e.ts` | tests/auth.e2e.ts | - | - | 미실행 | - |
| TC-02 | AC-01.2 | FLOW-04 | E2E | 시드 초기화 후 시드 보호자 계정 | GIVEN 로그인 화면 WHEN 틀린 비밀번호 입력 THEN 문구와 응답 쿠키 확인 | "아이디 또는 비밀번호가 올바르지 않습니다" 표시, 로그인 응답에 세션 쿠키 없음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/auth.e2e.ts` | tests/auth.e2e.ts | - | - | 미실행 | - |
| TC-03 | AC-01.3 | FLOW-04 | API | 시드 초기화 후 학원 A·B 담당자 세션 | GIVEN 학원 A 담당자 세션 WHEN 학원 B 프로그램 수정 API 호출 후 학원 A 프로그램 수정 API 호출 THEN 상태 코드와 재조회 값 확인 | 학원 B 수정 404·학원 B 값 불변, 학원 A 수정 200·바뀐 값 반환 | - | `uv run --directory apps/api pytest tests/test_authz.py` | apps/api/tests/test_authz.py | - | - | 미실행 | - |
| TC-04 | AC-01.4 | FLOW-04 | API | 시드 초기화 후 보호자 1·2 세션 | GIVEN 보호자 1 세션 WHEN 보호자 2 자녀 조회 API와 자기 자녀 조회 API 호출 THEN 상태 코드와 본문 확인 | 보호자 2 자녀 조회 404·본문에 보호자 2 자녀 별칭 없음, 자기 자녀 조회 200 | - | `uv run --directory apps/api pytest tests/test_authz.py` | apps/api/tests/test_authz.py | - | - | 미실행 | - |
| TC-05 | AC-01.5 | FLOW-04 | API | 시드 초기화 후 학교 1 담당자·보호자 세션 | GIVEN 학교 1 담당자 세션과 보호자 세션 WHEN 학교 2 시간표 수정 API, 보호자로 학원 프로그램 수정 API 호출 THEN 상태 코드와 재조회 값 확인 | 각각 404·403, 두 데이터 모두 불변 | - | `uv run --directory apps/api pytest tests/test_authz.py` | apps/api/tests/test_authz.py | - | - | 미실행 | - |
| TC-06 | AC-01.6 | FLOW-04 | API | 시드 초기화 후 | GIVEN 시드 적재 완료 WHEN 시드 계정의 DB 비밀번호 저장값 조회 THEN 평문과 비교 | 저장값이 시드 비밀번호 문자열과 다르고 arch가 정한 해시 접두어로 시작 | - | `uv run --directory apps/api pytest tests/test_auth.py` | apps/api/tests/test_auth.py | - | - | 미실행 | - |
| TC-07 | AC-01.7 | FLOW-04 | API | 시드 초기화 후 시드 보호자 계정, 시험용 시계 | GIVEN 잠기지 않은 계정 WHEN 틀린 비밀번호 5회 연속 후 6회째 올바른 비밀번호로 로그인 THEN 응답 문구와 세션 확인 | "로그인 시도가 많아 15분 동안 잠겼습니다", 세션 발급 없음 | - | `uv run --directory apps/api pytest tests/test_auth.py` | apps/api/tests/test_auth.py | - | - | 미실행 | - |
| TC-08 | AC-01.8 | FLOW-04 | API | AC-01.7로 잠긴 계정, 시험용 시계 | GIVEN 잠긴 계정 WHEN 시계를 15분 뒤로 옮기고 올바른 비밀번호로 로그인 THEN 응답 확인 | 로그인 성공(세션 발급) | - | `uv run --directory apps/api pytest tests/test_auth.py` | apps/api/tests/test_auth.py | - | - | 미실행 | - |
| TC-09 | AC-01.9 | FLOW-04 | API | 시드 초기화 후 시드 보호자 세션 | GIVEN 로그인 상태 WHEN 로그아웃 후 이전 세션 쿠키로 자녀 조회 API 호출 THEN 상태 코드 확인 | 401 | - | `uv run --directory apps/api pytest tests/test_auth.py` | apps/api/tests/test_auth.py | - | - | 미실행 | - |
| TC-10 | AC-01.10 | FLOW-04 | E2E | 시드 초기화 후 시드 보호자 계정 | GIVEN 보호자 로그인 상태 WHEN 새로 고침, 일정 탭 이동 후 챗봇 탭 복귀 THEN 화면 확인 | 로그인 화면이 다시 나오지 않고 보호자 화면 유지 | - | `APP_URL=http://localhost:13000 npx e2e run tests/auth.e2e.ts` | tests/auth.e2e.ts | - | - | 미실행 | - |
| TC-11 | AC-01.11 | FLOW-04 | API | 시드 초기화 후 시드 보호자 계정 | GIVEN 로그인 전 WHEN 시드 보호자로 로그인 THEN 응답 Set-Cookie 속성 확인 | 세션 쿠키에 HttpOnly, SameSite=Lax 또는 Strict, Max-Age 또는 Expires 존재 | - | `uv run --directory apps/api pytest tests/test_auth.py` | apps/api/tests/test_auth.py | - | - | 미실행 | - |
| TC-12 | AC-01.12 | FLOW-04 | API | 시드 초기화 후 | GIVEN 세션 쿠키 없음 WHEN 자녀 조회·자녀 등록·학원 프로그램 수정·학교 시간표 수정 API 호출 THEN 상태 코드, 본문, 호출 전후 DB 값 비교 | 4건 모두 401, 본문에 시드 데이터 값 없음, DB 값 동일 | - | `uv run --directory apps/api pytest tests/test_auth.py` | apps/api/tests/test_auth.py | - | - | 미실행 | - |
| TC-13 | AC-02.1 | FLOW-05 | E2E | 시드 초기화 후 학원 A 담당자 | GIVEN 프로그램 등록 화면(데스크톱 폭) WHEN 코딩·교과 학원·화목 16:00~17:00·교습비 200,000·기타경비 20,000·강사·초4~초6·정원 10·현재 3·위경도 입력 후 저장 THEN 목록과 새로 고침 후 목록 확인 | 목록에 해당 프로그램, 월 교습비 200,000·월 기타경비 20,000 분리 표시, 재조회 후 동일 | - | `APP_URL=http://localhost:13000 npx e2e run tests/academy.e2e.ts` | tests/academy.e2e.ts | - | - | 미실행 | - |
| TC-14 | AC-02.2 | FLOW-05 | E2E | 시드 초기화 후 학원 A 담당자 | GIVEN 프로그램 등록 화면 WHEN 종료가 시작보다 이름, 교습비 음수, 정원 0, 위경도 빈 값을 각각 넣고 저장 THEN 칸 오류와 목록 확인 | 해당 칸 옆 오류 표시, 목록 행 수 변화 없음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/academy.e2e.ts` | tests/academy.e2e.ts | - | - | 미실행 | - |
| TC-15 | AC-02.3 | FLOW-05 | API | 시드 초기화 후 학원 A 담당자 세션 | GIVEN AC-02.2의 잘못된 값 4종 WHEN 프로그램 등록 API 직접 호출 THEN 상태 코드와 DB 행 수 확인 | 모두 422, DB 프로그램 행 수 불변 | - | `uv run --directory apps/api pytest tests/test_programs.py` | apps/api/tests/test_programs.py | - | - | 미실행 | - |
| TC-16 | AC-02.4 | FLOW-05 | E2E | 시드 초기화 후 학원 A 담당자, 시드 보호자(초5) | GIVEN 학원 담당자가 피아노(예체능 학원) 프로그램 등록 WHEN 보호자가 선호 과목에 피아노를 넣고 추천 요청 THEN 비교표 확인 | 비교표에 그 피아노 프로그램 행 | - | `APP_URL=http://localhost:13000 npx e2e run tests/academy.e2e.ts` | tests/academy.e2e.ts | - | - | 미실행 | - |
| TC-17 | AC-02.5 | FLOW-05 | E2E | 시드 초기화 후 학원 담당자, 시드 보호자 | GIVEN 시드 미공개 프로그램(월 교습비 빈 값) WHEN 담당자 목록 열기, 보호자가 AC-06.1 조건으로 추천·일정 생성 THEN 목록 표시와 비교표·일정 확인 | 담당자 목록에 "미공개", 보호자 비교표·일정에 그 프로그램 없음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/academy.e2e.ts` | tests/academy.e2e.ts | - | - | 미실행 | - |
| TC-18 | AC-02.6 | FLOW-05 | E2E | 시드 초기화 후 학원 담당자, 시드 보호자 | GIVEN 확정 계획에 쓰이지 않은 프로그램 WHEN 담당자가 삭제 후 보호자가 추천 요청 THEN 목록과 비교표 확인 | 목록에서 사라짐, 비교표에도 없음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/academy.e2e.ts` | tests/academy.e2e.ts | - | - | 미실행 | - |
| TC-19 | AC-03.1 | FLOW-03 | E2E | 시드 초기화 후 초등학교 담당자 | GIVEN 학교 시간표 관리(데스크톱 폭) WHEN 5학년 수요일 하교 시각 13:40 저장 후 새로 고침 THEN 시간표 확인 | 13:40 표시, 재조회 후 동일 | - | `APP_URL=http://localhost:13000 npx e2e run tests/school.e2e.ts` | tests/school.e2e.ts | - | - | 미실행 | - |
| TC-20 | AC-03.2 | FLOW-03 | E2E | AC-03.1 완료, 그 학교 초5 시드 자녀 | GIVEN 하교 13:40 저장됨 WHEN 보호자가 그 자녀로 일정 생성 THEN 수요일 학원 수업 시작 시각 확인 | 수요일 수업 시작이 모두 13:40 + 이동 근사 시간 이후 | - | `APP_URL=http://localhost:13000 npx e2e run tests/school.e2e.ts` | tests/school.e2e.ts | - | - | 미실행 | - |
| TC-21 | AC-03.3 | FLOW-03 | E2E | 시드 초기화 후 학교 담당자, 그 학교 시드 자녀 보호자 | GIVEN 방과후 등록 화면 WHEN 로봇·금 14:00~15:00·교습비 30,000·강사·정원 15·현재 5 저장 후 보호자가 선호 과목 로봇으로 추천 THEN 비교표 확인 | 비교표에 유형 "방과후" 로봇 행 | - | `APP_URL=http://localhost:13000 npx e2e run tests/school.e2e.ts` | tests/school.e2e.ts | - | - | 미실행 | - |
| TC-22 | AC-03.4 | FLOW-03 | E2E | 시드 초기화 후 학교 담당자, 같은 학년·요일 14:00~15:00 항목 | GIVEN 기존 항목 있음 WHEN 14:30~15:30 저장 시도(화면), 같은 값 API 호출 THEN 문구·상태 코드·저장 여부 | "시간이 겹칩니다" 표시·미저장, API 422·DB 불변 | - | `APP_URL=http://localhost:13000 npx e2e run tests/school.e2e.ts` | tests/school.e2e.ts | - | - | 미실행 | - |
| TC-23 | AC-04.1 | FLOW-04 | E2E | 시드 초기화 후 시드 보호자 | GIVEN 자녀 탭(모바일 폭) WHEN 별칭·만 11·초5·학교·관심사 과학·목표 수학 심화·토 10:00~12:00 수영 저장 후 새로 고침 THEN 자녀 목록 확인 | 별칭과 학년 표시, 재조회 후 동일 | - | `APP_URL=http://localhost:13000 npx e2e run tests/children.e2e.ts` | tests/children.e2e.ts | - | - | 미실행 | - |
| TC-24 | AC-04.2 | FLOW-04 | E2E | AC-04.1 완료 | GIVEN 토 10:00~12:00 기존 일정 WHEN 그 자녀로 일정 생성 THEN 토요일 배치 확인 | 토 10:00~12:00에 다른 수업 0건 | - | `APP_URL=http://localhost:13000 npx e2e run tests/children.e2e.ts` | tests/children.e2e.ts | - | - | 미실행 | - |
| TC-25 | AC-04.3 | FLOW-04 | E2E | 시드 초기화 후 시드 보호자 | GIVEN 자녀 등록 화면, 만 나이 13 입력 WHEN 동의 확인 미체크 상태 확인 후 체크하고 저장 THEN 버튼 상태·문구·목록 | 미체크 시 저장 버튼 비활성·"법정대리인 동의 확인이 필요합니다", 체크 후 저장되어 목록에 표시 | - | `APP_URL=http://localhost:13000 npx e2e run tests/children.e2e.ts` | tests/children.e2e.ts | - | - | 미실행 | - |
| TC-26 | AC-04.4 | FLOW-04 | E2E·API | 시드 초기화 후 시드 보호자 | GIVEN 자녀 등록 화면 WHEN 입력 칸 목록 확인 후 AC-04.1 값으로 저장 API 응답 검사 THEN 칸과 응답 키 확인 | 실명·연락처 칸 없음, 응답 JSON에 실명·연락처 키 없음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/children.e2e.ts` | tests/children.e2e.ts | - | - | 미실행 | - |
| TC-27 | AC-04.5 | FLOW-04 | E2E | 시드 초기화 후 시간표 없는 학년 자녀 | GIVEN 해당 학년 시간표 없음 WHEN 일정 생성 클릭 후 요일별 하교 시각 입력해 생성 THEN 안내 문구와 배치 확인 | "학교 시간표가 없습니다. 하교 시각을 직접 입력해 주세요"와 입력 칸 표시, 생성 일정이 입력 시각 이후 | - | `APP_URL=http://localhost:13000 npx e2e run tests/children.e2e.ts` | tests/children.e2e.ts | - | - | 미실행 | - |
| TC-28 | AC-05.1 | FLOW-01 | E2E | 시드 초기화 후 시드 보호자(초5 1명), LLM 대역 고정 응답 | GIVEN 챗봇 홈(모바일 폭) WHEN "초5 아이 영어·수학 위주로 월 100만원 전후로 촘촘하게" 전송 THEN 조건 카드 확인 | 대상=초5 자녀, 선호=영어·수학, 목표 1,000,000원, 상한 1,100,000원, 밀도=촘촘하게 | - | `APP_URL=http://localhost:13000 npx e2e run tests/chat.e2e.ts` | tests/chat.e2e.ts | - | - | 미실행 | - |
| TC-29 | AC-05.2 | FLOW-01 | E2E | AC-05.1과 같음 | GIVEN 챗봇 홈 WHEN "…월 100만원 안에서 촘촘하게" 전송 THEN 조건 카드 확인 | 목표 1,000,000원, 상한 1,000,000원 | - | `APP_URL=http://localhost:13000 npx e2e run tests/chat.e2e.ts` | tests/chat.e2e.ts | - | - | 미실행 | - |
| TC-30 | AC-05.3 | FLOW-01 | E2E | AC-05.1 완료 | GIVEN 조건 카드 WHEN 상한을 1,000,000원으로 고쳐 저장, 일정 생성, 새 대화 열기 THEN 월 학원비와 조건 카드 확인 | 월 학원비 ≤ 1,000,000원, 새 대화 조건 카드 상한 1,000,000원 유지 | - | `APP_URL=http://localhost:13000 npx e2e run tests/chat.e2e.ts` | tests/chat.e2e.ts | - | - | 미실행 | - |
| TC-31 | AC-05.4 | FLOW-01 | E2E | AC-05.1 완료 | GIVEN 조건 카드 WHEN 유형=교과 학원, 요일=월·수·금 저장 후 추천 요청 THEN 비교표 전 행 확인 | 모든 행 유형 교과 학원, 요일 월·수·금 안 | - | `APP_URL=http://localhost:13000 npx e2e run tests/chat.e2e.ts` | tests/chat.e2e.ts | - | - | 미실행 | - |
| TC-32 | AC-05.5 | FLOW-01 | E2E | 시드 초기화 후 Azure OpenAI 키 없는 환경(대역 미사용) | GIVEN 챗봇 홈 WHEN AC-05.1 문장 전송 THEN 조건 카드와 응답 확인 | AC-05.1과 같은 조건 카드 값, 챗봇 응답 이어짐 | - | `APP_URL=http://localhost:13000 npx e2e run tests/chat-fallback.e2e.ts` | tests/chat-fallback.e2e.ts | - | - | 미실행 | - |
| TC-33 | AC-05.6 | FLOW-01 | E2E | 시드 초기화 후 LLM 대역 스키마 불일치 응답 주입 | GIVEN 챗봇 홈 WHEN AC-05.1 문장 전송 THEN 조건 카드와 화면 텍스트 | AC-05.1과 같은 조건 카드 값, 화면에 오류 원문 없음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/chat-fallback.e2e.ts` | tests/chat-fallback.e2e.ts | - | - | 미실행 | - |
| TC-34 | AC-05.7 | FLOW-01 | E2E(ai) | 시드 초기화 후 실제 Azure OpenAI(로컬, 앱을 저장소 밖 env 파일로 기동) | GIVEN 챗봇 홈 WHEN AC-05.1 문장 전송 THEN 스키마 검증 결과와 조건 카드 | 응답 스키마 검증 통과, 선호=영어·수학, 목표 1,000,000원 | - | `set -a; . "$HOME/.config/educonnect/azure-openai.env"; set +a 상태로 앱 기동 후 APP_URL=http://localhost:13000 npx e2e run tests/chat.ai.e2e.ts` | tests/chat.ai.e2e.ts | - | - | 미실행 | - |
| TC-35 | AC-06.1 | FLOW-01 | E2E | 시드 초기화 후 시드 보호자, 기준 시나리오 조건 | GIVEN 조건 카드 저장됨 WHEN 추천 요청 THEN 비교표 열과 과목 확인 | 각 행에 학원명·과목·유형·요일·시간·월 교습비·월 기타경비·이동 근사·추천 이유, 모든 행 과목 영어 또는 수학 | - | `APP_URL=http://localhost:13000 npx e2e run tests/recommend.e2e.ts` | tests/recommend.e2e.ts | - | - | 미실행 | - |
| TC-36 | AC-06.2 | FLOW-01 | E2E | AC-06.1과 같음 | GIVEN 비교표 표시 WHEN 이동 거리·시간 칸 확인 THEN "근사" 표기 | 모든 이동 값 옆에 "근사" | - | `APP_URL=http://localhost:13000 npx e2e run tests/recommend.e2e.ts` | tests/recommend.e2e.ts | - | - | 미실행 | - |
| TC-37 | AC-06.3 | FLOW-01 | E2E | 시드 초기화 후 시드 중1 전용 수학, 마감 영어 프로그램 | GIVEN 기준 시나리오 조건 WHEN 추천 요청 THEN 비교표 확인 | 두 프로그램 모두 비교표에 없음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/recommend.e2e.ts` | tests/recommend.e2e.ts | - | - | 미실행 | - |
| TC-38 | AC-06.4 | FLOW-01 | E2E | 시드 초기화 후 자녀 관심사=과학, LLM 대역 요청 기록 | GIVEN 조건 카드 저장됨 WHEN 추천 요청 THEN 대역 요청 본문과 추천 이유 | 요청 본문 관심사 "과학", 추천 이유 칸 비어 있지 않음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/recommend.e2e.ts` | tests/recommend.e2e.ts | - | - | 미실행 | - |
| TC-39 | AC-06.5 | FLOW-01 | E2E | 시드 초기화 후 LLM 대역 오류 주입 | GIVEN 기준 시나리오 조건 WHEN 추천 요청 THEN 추천 이유와 행 수 | 템플릿 설명(과목·주 횟수·이동 근사 분) 표시, 행 수 AC-06.1과 같음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/recommend.e2e.ts` | tests/recommend.e2e.ts | - | - | 미실행 | - |
| TC-40 | AC-06.6 | FLOW-01 | API | 시드 초기화 후 기준 시나리오 조건 | GIVEN 같은 조건 WHEN 추천 API 2회 호출 THEN 프로그램 순서 비교 | 두 응답의 프로그램 ID 순서 동일 | - | `uv run --directory apps/api pytest tests/test_recommend.py` | apps/api/tests/test_recommend.py | - | - | 미실행 | - |
| TC-41 | AC-07.1 | FLOW-01 | 단위·E2E | 시드 초기화 후 기준 시나리오 조건 | GIVEN 조건 저장됨 WHEN 일정 생성 THEN 주간 일정과 겹침 쌍 수 | 월~일에 학교·학원 함께 표시, 겹침 0쌍 | - | `uv run --directory apps/api pytest tests/test_engine.py` | apps/api/tests/test_engine.py | - | - | 미실행 | - |
| TC-42 | AC-07.2 | FLOW-01 | 단위 | 기준 시나리오 시드 | GIVEN 엔진 입력 WHEN 일정 생성 THEN 연속 항목 간 공백-이동 근사 계산 | 이동 부족(공백이 0분 미만) 0건 | - | `uv run --directory apps/api pytest tests/test_engine.py` | apps/api/tests/test_engine.py | - | - | 미실행 | - |
| TC-43 | AC-07.3 | FLOW-01 | 단위·E2E | 기준 시나리오 시드 | GIVEN 일정 생성 결과 WHEN 월 학원비 합계 계산·표시 확인 THEN 합계 비교 | 표시 합계 = Σ(월 교습비+월 기타경비), ≤ 1,100,000원 | - | `uv run --directory apps/api pytest tests/test_engine.py` | apps/api/tests/test_engine.py | - | - | 미실행 | - |
| TC-44 | AC-07.4 | FLOW-01 | 단위·E2E | 기준 시나리오 시드 | GIVEN 일정 생성 결과 WHEN 성공 기준 ③ 판정 THEN 금액·횟수·공백 | 월 학원비 900,000~1,100,000원, 영어·수학 각 주 2회 이상, 수업 있는 요일 공백 모두 30분 이하 | - | `uv run --directory apps/api pytest tests/test_engine.py` | apps/api/tests/test_engine.py | - | - | 미실행 | - |
| TC-45 | AC-07.5 | FLOW-01 | E2E | 시드 초기화 후 목표·상한 100,000원 | GIVEN 조건 저장됨 WHEN 일정 생성 THEN 결과 화면 | "조건을 만족하는 일정이 없습니다"와 완화 조건(예산·요일·과목 중 1개 이상) | - | `APP_URL=http://localhost:13000 npx e2e run tests/schedule.e2e.ts` | tests/schedule.e2e.ts | - | - | 미실행 | - |
| TC-46 | AC-07.6 | FLOW-01 | 단위 | 기준 시나리오 시드 | GIVEN 같은 조건 WHEN 일정 생성 2회 THEN 결과 비교 | 프로그램·요일·시각 동일 | - | `uv run --directory apps/api pytest tests/test_engine.py` | apps/api/tests/test_engine.py | - | - | 미실행 | - |
| TC-47 | AC-08.1 | FLOW-01 | E2E | AC-07.1 일정 | GIVEN 생성된 일정 WHEN 영어 프로그램 하나 제외 THEN 일정과 월 학원비 | 그 수업 사라짐, 월 학원비가 그 프로그램 (교습비+기타경비)만큼 감소 | - | `APP_URL=http://localhost:13000 npx e2e run tests/plan.e2e.ts` | tests/plan.e2e.ts | - | - | 미실행 | - |
| TC-48 | AC-08.2 | FLOW-01 | E2E | AC-07.1 일정 | GIVEN 생성된 일정 WHEN 학교 시간과 겹치는 프로그램으로 교체 THEN 칸 표시와 확정 버튼 | "시간 중복" 표시, 확정 버튼 비활성 | - | `APP_URL=http://localhost:13000 npx e2e run tests/plan.e2e.ts` | tests/plan.e2e.ts | - | - | 미실행 | - |
| TC-49 | AC-08.3 | FLOW-01 | E2E | AC-07.1 일정(위반 0) | GIVEN 생성된 일정 WHEN 확정 후 로그아웃·재로그인 THEN 일정 탭 확인 | 확정 계획 표시, 재로그인 후 동일 계획 | - | `APP_URL=http://localhost:13000 npx e2e run tests/plan.e2e.ts` | tests/plan.e2e.ts | - | - | 미실행 | - |
| TC-50 | AC-09.1 | FLOW-02 | E2E | 시드 초기화 후 학원 A 수학 포함 확정 계획 | GIVEN 확정 계획 있음 WHEN 학원 A 담당자가 그 프로그램 시간을 학교 수업과 겹치게 저장 THEN 담당자 화면 | "영향받는 계획 1건" | - | `APP_URL=http://localhost:13000 npx e2e run tests/impact.e2e.ts` | tests/impact.e2e.ts | - | - | 미실행 | - |
| TC-51 | AC-09.2 | FLOW-02 | E2E | AC-09.1 완료 | GIVEN 변경 저장됨 WHEN 보호자 일정 탭 열기 THEN 계획 표시 | "영향 있음 · 시간 중복" | - | `APP_URL=http://localhost:13000 npx e2e run tests/impact.e2e.ts` | tests/impact.e2e.ts | - | - | 미실행 | - |
| TC-52 | AC-09.3 | FLOW-02 | E2E | 시드 초기화 후 월 학원비 1,050,000원·상한 1,100,000원 확정 계획 | GIVEN 확정 계획 있음 WHEN 담당자가 그 프로그램 월 교습비 +100,000원 저장 THEN 보호자 일정 탭 | "영향 있음 · 예산 초과 50,000원" | - | `APP_URL=http://localhost:13000 npx e2e run tests/impact.e2e.ts` | tests/impact.e2e.ts | - | - | 미실행 | - |
| TC-53 | AC-09.4 | FLOW-02 | E2E | 영향 있는 확정 계획 | GIVEN 영향 표시 있음 WHEN 보호자가 조정안 열고 수락 THEN 대안·확정 계획·영향 표시 | 대안 위반 0건, 확정 계획이 대안으로 바뀜, 영향 표시 사라짐 | - | `APP_URL=http://localhost:13000 npx e2e run tests/impact.e2e.ts` | tests/impact.e2e.ts | - | - | 미실행 | - |
| TC-54 | AC-09.5 | FLOW-02 | E2E | 영향 있는 확정 계획 | GIVEN 영향 표시 있음 WHEN 조정안 거절 THEN 확정 계획과 표시 | 기존 계획 유지, "영향 있음" 남음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/impact.e2e.ts` | tests/impact.e2e.ts | - | - | 미실행 | - |
| TC-55 | AC-09.6 | FLOW-02 | E2E | 시드 초기화 후 수요일 학원 수업 포함 확정 계획 | GIVEN 확정 계획 있음 WHEN 학교 담당자가 초5 수요일 하교를 수업과 겹치게 늦춤, 대안 없는 시드 THEN 보호자 표시와 조정안 화면 | "영향 있음 · 시간 중복", 대안 없음 시 "조건을 만족하는 대안이 없습니다"와 완화 조건 | - | `APP_URL=http://localhost:13000 npx e2e run tests/impact.e2e.ts` | tests/impact.e2e.ts | - | - | 미실행 | - |
| TC-56 | AC-09.7 | FLOW-02 | E2E·API | AC-09.1 완료 | GIVEN 학원 A 담당자 세션 WHEN 영향 조회 화면 열기와 영향 조회 API 호출 THEN 화면 텍스트와 응답 키 | 계획 수만 있음, 자녀 별칭·학년·보호자 계정 정보 없음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/impact.e2e.ts` | tests/impact.e2e.ts | - | - | 미실행 | - |
| TC-57 | AC-10.1 | FLOW-01 | E2E·검사 | 시험용 가짜 `AZURE_OPENAI_*` 값(실제 값 아님)으로 빌드 | GIVEN 웹 빌드 산출물 WHEN FLOW-01 E2E 실행 중 응답 수집, 빌드 산출물 검색 THEN 가짜 값 문자열 검색 | 산출물·응답 모두 0건 | - | `APP_URL=http://localhost:13000 npx e2e run tests/secrets.e2e.ts` | tests/secrets.e2e.ts | - | - | 미실행 | - |
| TC-58 | AC-10.2 | FLOW-01 | API | LLM 대역 401·타임아웃 주입, 시험용 가짜 값 | GIVEN 설정 로드됨 WHEN 챗봇 API 호출 THEN 오류 응답·서버 로그 검색 | 가짜 키·엔드포인트 값 0건, 마스킹 표시만 | - | `uv run --directory apps/api pytest tests/test_llm_secrets.py` | apps/api/tests/test_llm_secrets.py | - | - | 미실행 | - |
| TC-59 | AC-10.3 | FLOW-01 | 검사·CI | 저장소 `.env.example`, CI 실행 기록 | GIVEN main SHA WHEN `.env.example` 검사, CI 시험 로그 확인 THEN 변수 이름·값·Azure 호출 여부 | 다섯 변수 이름만·값 비어 있음, CI가 대역으로 통과(Azure 호출 0) | - | `uv run --directory apps/api pytest tests/test_env_example.py` | apps/api/tests/test_env_example.py | - | - | 미실행 | - |
| TC-60 | AC-10.4 | FLOW-01 | E2E | 시드 초기화 후 LLM 대역 요청 기록 | GIVEN AC-05.1·AC-06.4 실행 WHEN 대역 요청 본문 검사 THEN 키 목록과 값 | 별칭·학년·관심사·조건만, 계정·비밀번호·실명·연락처·설정 값 없음 | - | `APP_URL=http://localhost:13000 npx e2e run tests/recommend.e2e.ts` | tests/recommend.e2e.ts | - | - | 미실행 | - |
| TC-61 | AC-10.5 | FLOW-01 | API | https 아닌 엔드포인트 설정 주입 | GIVEN 서버 기동 WHEN 챗봇 API 호출과 시작 로그 확인 THEN Azure 호출 여부·로그 | Azure 호출 없음, 대체 경로, 로그 "Azure OpenAI 설정 오류: https 필요"(값 없음) | - | `uv run --directory apps/api pytest tests/test_llm_secrets.py` | apps/api/tests/test_llm_secrets.py | - | - | 미실행 | - |
| TC-62 | AC-10.6 | FLOW-01 | 검사 | 저장소 추적 파일(git ls-files) | GIVEN main SHA WHEN 시험 스크립트로 패턴 검사 THEN 일치 건수 | 비밀값 대입 줄 0건, 엔드포인트 호스트명 0건(패턴은 스크립트에만) | - | `uv run --directory apps/api pytest tests/test_repo_secrets.py` | apps/api/tests/test_repo_secrets.py | - | - | 미실행 | - |
| TC-63 | AC-11.1 | FLOW-01 | 단위 | 빈 DB에 시드 적재 | GIVEN 시드 적재 WHEN 기관·프로그램 조회 THEN 개수·과목 | 학교 2(초1·중1, 정규·방과후 포함), 학원 5, 영어·수학과 예체능·기타 과목 1개 이상 | - | `uv run --directory apps/api pytest tests/test_seed.py` | apps/api/tests/test_seed.py | - | - | 미실행 | - |
| TC-64 | AC-11.2 | FLOW-01 | 단위 | 시드 적재 | GIVEN 시드 프로그램 전체 WHEN 필드 검사 THEN 빈 필드 목록 | 모든 필드 존재, 예외는 교습비 빈 미공개 1개와 마감 1개뿐 | - | `uv run --directory apps/api pytest tests/test_seed.py` | apps/api/tests/test_seed.py | - | - | 미실행 | - |
| TC-65 | AC-11.3 | FLOW-01 | 단위 | 시드 적재 | GIVEN 기준 시나리오 WHEN 학원 수업 시각 하나 변경 후 일정 재생성 THEN 결과 비교 | 데모 자녀 초5·중1 각 1명, 변경 전후 일정 다름 | - | `uv run --directory apps/api pytest tests/test_seed.py` | apps/api/tests/test_seed.py | - | - | 미실행 | - |
| TC-66 | AC-11.4 | FLOW-01 | 단위 | 이전 시험이 만든 프로그램·계획 | GIVEN 데이터 변경됨 WHEN 시드 초기화 명령 실행 THEN 개수 | AC-11.1과 같은 개수, 추가 데이터 없음 | - | `uv run --directory apps/api pytest tests/test_seed.py` | apps/api/tests/test_seed.py | - | - | 미실행 | - |
| TC-67 | AC-12.1 | FLOW-01 | E2E | 시드 초기화 후 시드 보호자 | GIVEN 로그인 WHEN 보호자 화면 머리 확인 THEN 텍스트 | "EDUCONNECT · 모두의 AI 교육 에이전트", 연동 상태 "모의" | - | `APP_URL=http://localhost:13000 npx e2e run tests/branding.e2e.ts` | tests/branding.e2e.ts | - | - | 미실행 | - |
| TC-68 | AC-12.2 | FLOW-01 | E2E | 시드 초기화 후 시드 보호자 | GIVEN 챗봇 화면 WHEN 공급자 표기와 전체 화면 텍스트 검사 THEN 텍스트 | "Azure OpenAI(국내 리전)", 엔드포인트 호스트명 0건 | - | `APP_URL=http://localhost:13000 npx e2e run tests/branding.e2e.ts` | tests/branding.e2e.ts | - | - | 미실행 | - |
| TC-69 | AC-13.1 | FLOW-01 | E2E | 시드 초기화 후 역할별 시드 계정 | GIVEN 보호자 3화면·기관 2화면 WHEN 각 화면에서 axe(WCAG 2.2 AA) 실행 THEN 위반 수 | 위반 0건 | - | `APP_URL=http://localhost:13000 npx e2e run tests/a11y.e2e.ts` | tests/a11y.e2e.ts | - | - | 미실행 | - |
| TC-70 | AC-13.2 | FLOW-01 | E2E | 시드 초기화 후 시드 보호자 | GIVEN 로그인 화면 WHEN 키보드만으로 로그인→조건 입력→일정 생성→확정 THEN 완료 여부·포커스 | 확정까지 완료, 단계마다 포커스 표시 보임 | - | `APP_URL=http://localhost:13000 npx e2e run tests/a11y.e2e.ts` | tests/a11y.e2e.ts | - | - | 미실행 | - |
| TC-71 | - | FLOW-01 | E2E(흐름) | 시드 초기화 후 시드 보호자, LLM 대역 | GIVEN 보호자 로그인(모바일 폭) WHEN 챗봇 조건 입력→추천·비교→일정 생성→한 과목 교체→확정→재로그인 THEN 확정 계획과 기준 시나리오 값 | 위반 0건 확정 계획 저장·재로그인 후 동일, 월 학원비 900,000~1,100,000원 (REQ-05~08·10~13 흐름 전체) | - | `APP_URL=http://localhost:13000 npx e2e run tests/flow-01.e2e.ts` | tests/flow-01.e2e.ts | - | - | 미실행 | - |
| TC-72 | - | FLOW-02 | E2E(흐름) | 시드 초기화 후 시드 확정 계획 | GIVEN 학원 A 담당자 로그인(데스크톱 폭) WHEN 프로그램 시간 변경→보호자 영향 확인→조정안 수락 THEN 기관·보호자 화면 | 기관 화면 영향 계획 수, 보호자 영향 사유, 수락 후 대안 계획·영향 표시 사라짐 (REQ-09 흐름 전체) | - | `APP_URL=http://localhost:13000 npx e2e run tests/flow-02.e2e.ts` | tests/flow-02.e2e.ts | - | - | 미실행 | - |
| TC-73 | - | FLOW-03 | E2E(흐름) | 시드 초기화 후 초등학교 담당자 | GIVEN 학교 시간표 관리(데스크톱 폭) WHEN 하교 시각·방과후 저장→보호자 일정 생성 THEN 시간표와 일정 | 저장 값 재조회 동일, 일정이 하교 이후로만 배치 (REQ-03·13 흐름 전체) | - | `APP_URL=http://localhost:13000 npx e2e run tests/flow-03.e2e.ts` | tests/flow-03.e2e.ts | - | - | 미실행 | - |
| TC-74 | - | FLOW-04 | E2E(흐름) | 시드 초기화 후 | GIVEN 로그인 화면 WHEN 역할별 로그인→보호자 자녀 등록(동의 포함)→목록 THEN 역할별 첫 화면과 자녀 목록 | 역할별 첫 화면, 자녀가 최소 항목으로 목록에 표시 (REQ-01·04·13 흐름 전체) | - | `APP_URL=http://localhost:13000 npx e2e run tests/flow-04.e2e.ts` | tests/flow-04.e2e.ts | - | - | 미실행 | - |
| TC-75 | - | FLOW-05 | E2E(흐름) | 시드 초기화 후 학원 A 담당자 | GIVEN 학원 프로그램 관리(데스크톱 폭) WHEN 프로그램 등록→목록 확인→보호자 추천 후보 확인 THEN 목록과 비교표 | 교습비·기타경비 분리 저장, 보호자 추천 후보에 반영 (REQ-02·13 흐름 전체) | - | `APP_URL=http://localhost:13000 npx e2e run tests/flow-05.e2e.ts` | tests/flow-05.e2e.ts | - | - | 미실행 | - |

## 5. 실행 이력

시험 표는 시험마다 최신 결과만 남긴다. 실행마다 원자료(명령 출력, 보고서, 화면, 로그)는 `docs/evidence/runs/` 아래 실행 ID 이름의 폴더에 따로 보존하고 덮어쓰지 않는다. 실행 ID는 `RUN-YYYYMMDD-HHMM` 형식을 쓴다.

| 실행 ID | 소스 SHA | 시각(UTC) | 명령 | 결과 요약 | 원자료 경로 |
| --- | --- | --- | --- | --- | --- |
| - | - | - | - | 실행 없음(계획 단계): PASS 0 · FAIL 0 · SKIP 0 · 미실행 75 | - |

## 6. 미검증·제외

| 대상 | 판정 | 이유 | 후속 조치 |
| --- | --- | --- | --- |
| TC-01~75 전체 | 미실행 | 제품 코드 없음(계획 단계) | Issue PR 병합 뒤 main SHA로 실행해 기록 모드로 갱신 |
| 시험 코드 경로·실행 명령 | 미검증 | arch(작성 중)와 기반 Issue가 정하기 전의 계획 경로다. 저장소 뼈대(`tests/*.e2e.ts`, `apps/api/tests/`) 기준 | arch final 뒤 경로가 다르면 이 표의 해당 칸만 갱신 |
| TC-06(해시 접두어) | 미검증 | 해시 알고리즘이 arch에서 정해짐(PRD 9절 4) | arch 확정 뒤 기대 접두어 기입 |
| TC-34(`ai` 태그) | 미실행 | 실제 Azure 호출은 로컬에서만 실행(D-15). CI에서는 실행하지 않음 | 로컬 실행 결과를 근거로 기록 |
| TC-59(CI 대역 통과) | 미검증 | CI 워크플로가 아직 없음 | CI 구성 뒤 실행 기록으로 확인 |
| 저장소·CI 시크릿 미등록(SEC-11) | 미검증 | 자동 시험 불가, 사람 확인 항목 | 제출 전 저장소 설정 확인 요청 |
| SEC-10 보안 감사 기록 | 비해당(현재) | 확인 조건 없음. 범위는 arch에서 정함 | arch 결정 뒤 AC가 생기면 TC 추가 |
