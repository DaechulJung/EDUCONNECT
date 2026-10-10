> 연습용 임시 양식 — 주최 측 양식 미제공. 온보딩 개발 문서 안내 기준으로 팀이 작성했으며 주최 양식을 받으면 교체한다.

# 개발 기록: [서비스 이름]

## 1. 참여자

| 참여자 | 구분(사람·에이전트) | 역할 | 담당 작업 | 리뷰 담당 |
| --- | --- | --- | --- | --- |
| [이름] | [사람 또는 에이전트] | [역할] | [Issue 번호·문서] | [리뷰한 대상] |

## 2. 작업 기록

Issue마다 AI를 어떤 목적으로 쓰고 무엇을 지시했는지, 어떤 코드가 바뀌었고 어떻게 검증·수정·재시험했는지 적는다. 확인하지 않은 내용은 적지 않는다.

| Issue | AI 사용 목적 | 지시 요지 | 변경 코드 | 검증 | 수정 | 재시험 | 커밋 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| #14 | 기반 계약 구현(모델·마이그레이션·라우트 껍데기·세션·권한·AI 경계·시험 라우트·웹 레이아웃) | BASE-01.1~10을 arch AD-3·AD-16 계약대로 구현, 이후 기능 PR이 공통 파일을 고치지 않게 고정 (AILIEN_BUILDER, Claude Opus) | `apps/api/app/models/*`, `apps/api/alembic/versions/0002*`, `apps/api/app/api/*`, `apps/api/app/core/{config,safety}.py`, `apps/api/app/ai/*`, `apps/web/app/(parent)`·`(org)`·로그인, `compose.yml` | `npm run check` PASS, smoke E2E 2/2, `gen:api` diff 없음 (PR #15 본문 AC 표) | VERIFIER 수정 요청: `DB_PORT`·`REDIS_PORT`가 앱 주소에 반영되지 않아 다른 프로젝트 DB(15432)에 접속 → 포트 변수로 주소 구성, DB 이름 `educonnect`, 파괴적 작업 전 `current_database()` 확인(`1b330d4`) | VERIFIER 격리 clone(edu-v15) `npm run check`·smoke E2E 통과, 다른 프로젝트 DB 스냅숏 차이 없음. 병합 후 검증(edu-main) api 112·web 3·E2E 2/2, 무환경 compose 기동 실패 1건 → #11 PR에서 `6d7e188`로 후속 수정 | [2af3651](https://github.com/DaechulJung/EDUCONNECT/commit/2af3651) [1e48ae4](https://github.com/DaechulJung/EDUCONNECT/commit/1e48ae4) [a25a738](https://github.com/DaechulJung/EDUCONNECT/commit/a25a738) [1b330d4](https://github.com/DaechulJung/EDUCONNECT/commit/1b330d4), 병합 [320437e](https://github.com/DaechulJung/EDUCONNECT/commit/320437e) |

## 3. 리뷰

| 대상(PR·커밋) | 작성자 | 리뷰어 | 지적 사항 | 처리 결과 |
| --- | --- | --- | --- | --- |
| PR #15 (#14) | AILIEN_BUILDER | AILIEN_VERIFIER | 포트 변수가 앱·alembic·시험 주소에 반영되지 않음(다른 프로젝트 DB 접속 위험), 전용 DB 이름·파괴적 작업 전 확인 요청(정대철_테스트 추가) | 반영 `1b330d4`, VERIFIER 승인 후 병합 `320437e` |

## 4. 개선 전후 비교

측정한 값만 적는다. 측정하지 않은 항목은 값 칸에 `미측정`을 쓴다.

| 항목 | 개선 전 | 개선 후 | 측정 방법 | 근거 |
| --- | --- | --- | --- | --- |
| [예: 시험 통과 수] | [값 또는 미측정] | [값 또는 미측정] | [명령·절차] | [경로] |

## 5. 배운 점

- [반복하지 않을 실수와 그 규칙]
