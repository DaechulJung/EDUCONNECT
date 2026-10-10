# Scaffold Context

이 프로젝트는 setup이 깐 해커톤 공통 뼈대 위에 있다. `bmad-architecture`가 시작할 때 고정 사실로 읽는다. 아래 "정해진 것"은 다시 정하거나 다른 starter를 추천하지 않고, 이 뼈대를 확장하는 방향으로 설계한다. 스택과 버전은 `project-context.md`에 있다. 뼈대를 크게 바꾼 뒤에는 이 파일도 고친다.

## 정해진 것

| 영역 | 구조 |
|---|---|
| 저장소 | 모노레포. `apps/web`(npm workspace), `apps/api`(uv 프로젝트), 루트 `package.json` 스크립트로 둘을 함께 돌린다 |
| 웹 | Next.js App Router. `app/layout.tsx`가 KDS CSS를 `<link>`로 연결, `app/providers.tsx`가 TanStack Query, `output: "standalone"` |
| 웹 ↔ API | 같은 출처. `next.config.ts` rewrites가 `/api/*`를 FastAPI로 넘긴다(개발 `localhost:8000`, 컨테이너 `API_URL`, 빌드 때 고정). CORS 설정 없음 |
| API 계약 | FastAPI가 OpenAPI 원본. `npm run gen:api`가 서버 없이 `apps/web/openapi.json`을 뽑고 `@hey-api/openapi-ts`로 `apps/web/lib/client`(함수·타입)를 만든다. operation id는 라우트 함수 이름이다. 생성 코드는 손으로 고치지 않는다 |
| API 구조 | `app/main.py`가 라우터를 `/api` 접두어로 붙인다. `app/api/`에 라우터, `app/core/`에 설정(`config.py`, pydantic-settings·환경 변수)·DB(`db.py`)·Redis(`redis.py`) |
| DB | PostgreSQL 18 + pgvector. SQLAlchemy 2 async(psycopg 3), 요청마다 `Depends(get_session)`, 모델은 `Base`(DeclarativeBase)를 상속 |
| 마이그레이션 | alembic만 쓴다(`apps/api/alembic/`, 첫 리비전이 `vector` 확장). 새 모델은 `alembic/env.py`에서 import해야 autogenerate가 본다 |
| 캐시·큐 | Redis 하나(`redis.asyncio`, `app/core/redis.py`). 별도 큐·워커는 아직 없다 |
| 실행 | `compose.yml`: db · redis · api · web, 모두 healthcheck. 개발은 `npm run infra`(db 15432 · redis 16379) + `npm run dev:api` · `npm run dev:web` |
| 검사 | `npm run check`(infra → migrate → 웹·API lint·format·타입·테스트). `.github/workflows/ci.yml`이 main으로 가는 PR에서 같은 검사·빌드를 하고 compose로 앱을 띄워 화면 시험 전체를 돌린다. 테스트는 웹 vitest, API pytest, 화면 e2e(`tests/*.e2e.ts`, `e2e.config.ts`) |
| 예시 | `/api/health`(DB·pgvector·Redis 상태)와 그것을 보여 주는 첫 화면(`apps/web/app/page.tsx`). 실제 기능으로 바꿀 자리다 |

## 기능을 붙이는 자리

- API: `app/api/<기능>.py`에 `APIRouter`를 만들고 `main.py`에서 `/api`로 include한다. 요청·응답은 Pydantic 모델로 선언해 OpenAPI에 드러나게 한다.
- 데이터: `app/models.py`(커지면 `app/models/`)에 모델을 두고 `alembic revision --autogenerate`로 마이그레이션을 만든다. 벡터 열은 pgvector(`pgvector.sqlalchemy`)를 쓴다.
- 웹: 화면은 `apps/web/app/` 라우트, 서버 호출은 `lib/client` 생성 함수와 TanStack Query, UI는 KDS 2.0(`kds-design` 스킬).
- API를 바꾸면 `npm run gen:api`로 웹 클라이언트를 다시 만든다.

## 아키텍처 문서가 정할 것

뼈대에 없는 것만 정한다: 도메인 모델과 테이블, API 엔드포인트 목록, 인증·권한, 외부 연동(LLM·외부 API), 백그라운드 작업(필요하면 Redis 기반으로), 파일 저장, 벡터 검색을 쓰는 곳과 임베딩 방식.
