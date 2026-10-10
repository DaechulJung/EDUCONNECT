aborted 10:57Z: pytest deadlock (TRUNCATE waiting on idle-in-transaction session) after failures; first attempt

- 정정(2026-10-10T11:11Z): 원인은 두 VERIFIER 세션이 같은 `edu-main` DB를 동시에 사용한 것(10:57Z 관찰). 이후 `verify-runs/LOCK-<프로젝트>` 잠금으로 한 프로젝트에서 실행 하나만 돌린다.
