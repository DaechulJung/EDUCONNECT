<!-- kode-harness-lite:dev-harness -->
## 작업 기록 (todo · lessons)

- 여러 단계이거나 파일을 고치는 작업은 시작 전에 `tasks/todo.md`에 완료 조건과 체크 항목을 적는다. 끝난 항목은 바로 체크하고, 하다가 찾은 일은 추가한다.
- 끝내기 전에 프로젝트 전체 검사를 돌린다(setup 뼈대는 루트 `npm run check` — db·redis를 띄우고 웹·API lint·format·타입·테스트, CI와 같다).
- 작업을 마치면 `tasks/lessons.md` 끝에 `## YYYY-MM-DD - 작업 요약`과 문제·원인 / 교훈 / 다음에 적용할 것을 추가한다. 남길 교훈이 없어도 그 이유를 `tasks/lessons.md`에 한 줄 적는다.
- 작업을 시작할 때 `tasks/lessons.md`의 최근 교훈 중 이번 작업과 관련된 것을 적용한다.

## Issue 개발

코드를 쓰기 전에 `kode-guide` 스킬을 열고 따른다.

## E2E·회귀 시험 (Issue마다 필수)

- 시험 기준은 시험 문서(보통 `docs/e2e-test.md`)의 TC다. 이 Issue의 확인 조건에 연결된 TC를 `e2e` 스킬로 시험 코드(`tests/*.e2e.ts`)로 만들어 실행한다. 만든 시험 코드 경로는 그 확인 조건의 자료로 붙이고(`kode-cli`의 `set <번호> --item <조건ID> --evidence tests/<파일>.e2e.ts`), 시험 문서 양식에 시험 코드·소스 위치를 적을 수 있는 칸이 있으면 반드시 그 TC 행에도 적는다(칸이 전혀 없을 때만 생략하고, 칸을 새로 만들지 않는다). 연결된 TC가 없으면 `e2e-doc` 계획 모드로 먼저 만들고, 프로젝트에 e2e가 없으면 `e2e` 스킬의 setup부터 한다.
- 버그는 `systematic-debugging` 스킬을 따르고, 고치기 전에 그 버그를 재현하는 E2E 시험을 만들어 실패를 확인한다.
- 완료 조건을 `done`으로 기록하거나 PR을 만들기 전에 전체 검사(`npm run check`)와 이 Issue에 연결된 E2E(`npx e2e run tests/<파일>.e2e.ts`)를 돌린다. 하나라도 실패하면 `done`으로 기록하지 않는다.
- E2E 전체(회귀 시험)는 main으로 가는 PR에서 CI가 돌린다. CI가 통과해야 머지한다(`gh pr checks <PR> --watch`). CI에 E2E가 없는 프로젝트면 PR을 만들기 전에 `npx e2e run`으로 전체를 직접 돌린다.
- 시험이 끝나면 `e2e-doc` 기록 모드로 시험 문서의 결과·근거를 갱신한다.

## 프론트엔드 만들 때 규칙 (KDS 2.0)

화면·컴포넌트 작업을 시작하면 먼저 `kds-design` 스킬을 열고 그 규칙을 따른다(KDS 2.0 + AID-X 브랜드 레이어: 템플릿·컴포넌트·흐름·검사가 스킬에 있다). 키트는 앱의 `public/kds`, React 컴포넌트는 `components/kds`(src가 있으면 `src/components/kds`)에 있다.

- 끝내기 전에 스킬의 검사(`kds-lint`)를 돌려 error 0을 확인한다.
- 쓰지 않는 것: HEX·숫자 팔레트(`gray-500` 등)·`text-sm`·`@/components/ui`·직접 그린 `<svg`·새 `@keyframes`(해커톤 점검 FAIL).
- 새 아이콘·이미지는 사용자가 요청할 때만 Codex `imagegen`으로 만든다: Codex는 `$imagegen`, 다른 호스트는 `codex exec --sandbox workspace-write "<imagegen 지시와 저장 경로>" < /dev/null`. SVG가 아니라 투명 배경 PNG를 assets에 저장하고 `<img alt>`로 쓴다.
<!-- /kode-harness-lite:dev-harness -->
