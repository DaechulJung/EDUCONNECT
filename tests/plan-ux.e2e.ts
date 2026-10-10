import { expect } from 'e2e'
import { beforeEach, test } from '@e2e-dev/web'
import { AROUND, TASK, api, resetSeed, row, send, signInParent } from './chat-support'
import { AROUND_REPLY, makePlan, saveConditions, weekView } from './plan-support'

// Document·code audit, group 1 (정대철_테스트 13:56Z, _records/AUDIT_TRIAGE.md 05-2·05-6·07-4·07-5·08-3).
// Each test was RED on main aec2f3f. The seed parent's 초5 child, conditions from the LLM double (AROUND_REPLY,
// 가능 요일 not said).
beforeEach(async ({ app, screen }) => {
  await resetSeed(app)
  await app.clearState()
  await signInParent(app, screen)
  await app.open('/chat')
})

test('#5 회귀 가능 요일을 말하지 않으면 조건 카드의 가능 요일이 월·화·수·목·금이다', async ({ app, screen }) => {
  // experience 157행: 기본값 가능 요일=월~금 (was "정하지 않음", and the server read it as every day).
  await api(app, '/api/test/llm', { task: TASK, mode: 'fixed', response: AROUND_REPLY })
  await send(screen, AROUND)
  await expect(row(screen, '가능 요일')).toHaveText(/월·화·수·목·금$/, { timeout: 15_000 })
})

test('#7 회귀 일정을 만드는 동안 "학교 시간표와 학원을 맞춰 보는 중"이 상태 줄로 보인다', async ({ app, screen, browser }) => {
  // experience 72·98행: kds-chat__thinking 단계 문구, role="status". The draft response is held until checked.
  await saveConditions(app, screen)
  let release!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  await browser.route('**/api/plans/draft', async (route) => {
    await held
    await route.continue()
  })
  await makePlan(screen)
  const step = screen.getByText('학교 시간표와 학원을 맞춰 보는 중')
  await expect(step).toBeVisible({ timeout: 10_000 })
  await expect(step).toHaveAttribute('role', 'status')
  release()
  await expect(weekView(screen)).toBeVisible({ timeout: 15_000 })
  await expect(screen.getByText('학교 시간표와 학원을 맞춰 보는 중')).toHaveCount(0)
})

test('#7 회귀 일정을 만들면 결과를 먼저 쓰는 챗봇 답변과 교습비·기타경비로 나눈 내역이 보인다', async ({ app, screen }) => {
  // experience 63행 (답변: 결과 먼저, 이유 뒤), prd 68행·experience 49행 (내역 '교습비'·'기타경비').
  await saveConditions(app, screen)
  await makePlan(screen)
  await expect(weekView(screen)).toBeVisible({ timeout: 15_000 })
  await expect(screen.getByText(/^영어 \d곳·수학 \d곳으로 월 [\d,]+원 일정을 만들었어요\. 학교 하교 뒤 이동 시간을 넣었어요\.$/)).toBeVisible()
  await screen.getByText('프로그램별 내역').tap()
  const lines = await screen.getByRole('list', '월 학원비 내역').getByRole('listitem').allTextContents()
  expect(lines.length).toBeGreaterThan(0)
  for (const line of lines) expect(line).toMatch(/교습비 [\d,]+원 \+ 기타경비 [\d,]+원 = [\d,]+원$/)
})

test('#8 회귀 바꾸기 후보를 불러오지 못하면 오류 문구와 다시 시도가 보이고, 다시 시도하면 후보가 보인다', async ({ app, screen, browser }) => {
  // experience 100행 오류 상태. The first candidate request fails; the retry goes through.
  await saveConditions(app, screen)
  await makePlan(screen)
  await expect(weekView(screen)).toBeVisible({ timeout: 15_000 })
  let failed = false
  await browser.route('**/api/recommendations', async (route) => {
    if (failed) return route.continue()
    failed = true
    await route.fulfill({ status: 500, json: { detail: 'internal' } })
  })
  await screen.getByRole('button', '새봄영어수학학원 영어 바꾸기').first().tap()
  const sheet = screen.getByRole('dialog', '영어 수업 바꾸기')
  await expect(sheet.getByText('응답을 받지 못했어요. 입력은 그대로 있어요.')).toBeVisible({ timeout: 10_000 })
  await expect(sheet.getByText('바꿀 수 있는 같은 과목 수업이 없어요')).toHaveCount(0)
  await sheet.getByRole('button', '다시 시도').tap()
  await expect(sheet.getByRole('list', '바꿀 수업')).toBeVisible({ timeout: 10_000 })
})
