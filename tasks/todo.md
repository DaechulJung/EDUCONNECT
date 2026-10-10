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
