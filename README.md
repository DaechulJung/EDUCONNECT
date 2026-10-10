# App

해커톤 공통 뼈대예요. 웹(Next.js · React · TypeScript · Tailwind · KDS 2.0 + AID-X 브랜드 레이어), API(FastAPI · SQLAlchemy · Alembic), PostgreSQL 18(pgvector), Redis를 한 저장소에서 띄워요. 스택과 버전은 `project-context.md`에 있어요.

## 바로 실행

```bash
docker compose up --build --wait    # http://localhost:3000 · API 문서 http://localhost:8000/docs
docker compose down                 # 끄기 (데이터까지 지우려면 -v)
```

첫 화면이 데이터베이스·벡터 검색·Redis 연결 상태를 보여 줘요.

## 개발

필요한 것: Node.js 24 이상, [uv](https://docs.astral.sh/uv/), Docker.

```bash
npm install                 # 웹 의존성
npm run infra               # db · redis만 띄움 (localhost:15432 · 16379, 로컬 PostgreSQL과 겹치지 않게)
npm run migrate             # 마이그레이션 적용 (pgvector 확장 포함)
npm run dev:api             # API :8000, 코드를 바꾸면 다시 시작
npm run dev:web             # 웹 :3000, /api는 next.config.ts가 :8000으로 전달
npm run gen:api             # API를 바꾼 뒤 웹 클라이언트(apps/web/lib/client) 다시 생성 — 서버를 띄우지 않아도 된다
npx e2e run tests/<파일>    # 화면 시험(앱이 떠 있어야 함). 처음 한 번 npx @e2e-dev/web install chromium
```

DB 이름·계정 기본값은 `educonnect`예요. 다른 worktree에서 포트를 바꿀 때는 `DB_PORT`·`REDIS_PORT`(·`WEB_PORT`·`API_PORT`)만 바꾸면 앱·alembic·시험이 같은 포트로 붙어요. `DATABASE_URL`·`REDIS_URL`을 주면 그 값이 우선이에요. 시험 초기화·`/api/test/reset`·시드 초기화는 접속한 DB 이름이 `educonnect`(또는 `educonnect_*`)가 아니면 아무것도 지우지 않고 멈추고, Redis는 `educonnect:` 키만 지워요.

끝내기 전에: `npm run check` — db·redis를 띄우고 마이그레이션한 뒤 웹·API의 lint·format·타입·테스트를 한 번에 돌려요(Docker가 켜져 있어야 해요). main으로 가는 PR에서는 `.github/workflows/ci.yml`이 같은 검사와 빌드를 하고, 앱 전체를 Docker로 띄워 화면 시험(`tests/*.e2e.ts`) 전체를 돌려요. main에 바로 올린 문서 커밋에서는 돌지 않아요.

## 구조

```
apps/web/    Next.js(App Router). app/page.tsx가 첫 화면, app/layout.tsx가 KDS CSS 연결, lib/client/가 API 함수와 타입(OpenAPI에서 생성)
apps/api/    FastAPI. app/api/에 라우터, app/core/에 설정 · DB · Redis, alembic/에 마이그레이션
compose.yml  db · redis · api · web(Next.js가 /api를 api로 전달)
tests/       화면 시험(e2e). docs/e2e-test.md의 TC마다 하나씩, e2e.config.ts가 http://localhost:3000을 시험
```

## 주제가 정해지면

- 첫 화면(`apps/web/app/page.tsx`)과 `/api/health` 예시를 실제 기능으로 바꿔요.
- 모델은 `apps/api/app/models.py`에 두고 `alembic/env.py`에서 import한 뒤 `uv run --directory apps/api alembic revision --autogenerate -m "<내용>"`으로 마이그레이션을 만들어요.
- 화면은 `kds-design` 스킬을 먼저 열고 KDS 2.0 키트(`apps/web/public/kds`)와 컴포넌트(`apps/web/components/kds`)로 만들어요(AGENTS.md).
- KT Flow 글꼴(해커톤 참가자 전용)과 AID-X 이미지(KT 내부 한정)는 `.gitignore`로 빠져 있어요. 저장소를 받은 사람은 `kds-lint`가 알려 주는 `install-kds.sh` 명령을 한 번 실행하면 채워져요.
