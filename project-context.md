# Project Context

팀 기본 스택이다. `bmad-prd` · `bmad-architecture` · `bmad-review`가 시작할 때 읽고, 여기 정해진 것은 다시 정하지 않는다. 이 프로젝트의 스택이 다르면 이 파일을 고친다.

## 기본 스택 (버전 확인 2026-10-08)

| 영역 | 스택 |
|---|---|
| Mobile | **이번 과제(EDUCONNECT) 범위 제외 — 반응형 웹 우선** (팀 기본값: Android · Kotlin 2.4 · Jetpack Compose (BOM 2026.09) · AGP 9.4 · Gradle 9.8 · compileSdk·targetSdk 37 · minSdk 26) |
| Backend | Python 3.14 · uv · FastAPI · Pydantic 2 · SQLAlchemy 2.1 (async) · Alembic · psycopg 3 · uvicorn |
| DB | PostgreSQL 18 · pgvector 0.8 (로컬 개발 이미지 `pgvector/pgvector:pg18`) |
| Frontend | Node 24 LTS · npm workspaces · Next.js 16.4 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · KDS 2.0 + AID-X 브랜드 레이어 (`kds-design` 스킬) |

## 이렇게 정한 이유

- PostgreSQL 18: 현재 최신 안정판이다(지원 종료 2030-11). 19는 아직 나오지 않았다. pgvector 0.8은 18용 공식 이미지가 있다.
- psycopg 3: 앱(async)과 Alembic(sync)이 드라이버 하나를 함께 쓰고, pgvector의 Python 패키지가 지원한다.
- Next.js 16.4: 현재 최신 안정판이다. App Router에 `output: "standalone"`으로 컨테이너를 만들고, `/api`는 rewrites로 FastAPI에 붙여 같은 출처로 쓴다.
- TypeScript 5: create-next-app 16.4와 eslint-config-next가 5 기준이다.
- Node 24: 현재 Active LTS다. 26은 2026-10-28에 LTS가 되므로 그 뒤에 올린다. 패키지 매니저는 npm이다(Node 25부터 corepack이 빠져 pnpm은 PC마다 설치가 필요하다).
- KDS 2.0: KT UX Design System 공식 해커톤 키트다. 해커톤 규정상 프론트는 React 계열이라 Next.js(React 19)에 키트 CSS와 `kds-design`의 React 컴포넌트를 얹고, AID-X 브랜드 레이어로 해커톤 톤을 입힌다.
- targetSdk 37: Google Play는 2026-08-31부터 새 앱과 업데이트에 API 36 이상을 요구한다. minSdk 26은 androidx(core · Compose UI)의 하한 23보다 높여 Android 8.0 이상 API를 분기 없이 쓰기 위해서다.

## 규칙

- 위 표에 없는 프레임워크 · DB · UI 라이브러리를 새로 들이지 않는다. 필요하면 이유와 함께 사용자에게 먼저 묻는다.
- 벡터 검색은 별도 벡터 DB 없이 PostgreSQL의 pgvector로 한다. 스키마 변경(`CREATE EXTENSION vector` 포함)은 Alembic 마이그레이션으로만 한다.
- 새 프로젝트를 만들 때 메이저 버전은 이 표를 따르고, 패치 버전은 그때의 최신 안정판을 쓴다.
- 화면은 KDS 2.0 키트(`kds-*`)와 `kds-design` 스킬의 React 컴포넌트로 만든다.
