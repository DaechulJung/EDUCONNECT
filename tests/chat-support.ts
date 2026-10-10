import { expect, type App, type Screen } from 'e2e'

// Shared steps for the chat TCs (docs/e2e-test.md TC-28~33). The app must run with
// ENABLE_TEST_ROUTES=1 and the seed password in SEED_PASSWORD (same value the app seeded with).
export const AROUND = '초5 아이 영어·수학 위주로 월 100만원 전후로 촘촘하게'
export const WITHIN = '초5 아이 영어·수학 위주로 월 100만원 안에서 촘촘하게'
export const TASK = 'extract_conditions'

export async function api(app: App, path: string, body?: unknown) {
  const response = await fetch(new URL(path, app.baseUrl), {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  expect(response.status).toBe(200)
  return response.json()
}

// Seed back (AC-11.4) so every TC starts from the seed parent with one 초5 child.
export async function resetSeed(app: App) {
  await api(app, '/api/test/reset', {})
}

export async function signInParent(app: App, screen: Screen) {
  const password = process.env.SEED_PASSWORD
  expect(password, 'SEED_PASSWORD').toBeTruthy()
  await app.open('/login')
  await screen.getByLabel('아이디').fill('parent1')
  await screen.getByLabel('비밀번호').fill(password!)
  await screen.getByRole('button', '로그인').tap()
  await expect(screen.getByRole('heading', '로그인')).not.toBeVisible({ timeout: 10_000 })
}

export async function send(screen: Screen, text: string) {
  // The page answers "먼저 자녀를 등록해 주세요" if the text goes out before the child list arrives (TC-16 flake, PR #26 run).
  await expect(screen.getByText(/의 과목·예산·요일을 말씀해 주세요/)).toBeVisible({ timeout: 10_000 })
  await screen.getByLabel('챗봇에 보낼 말').fill(text)
  await screen.getByRole('button', '보내기').tap()
}

export function row(screen: Screen, label: string) {
  return screen.getByRole('article', '조건 카드').getByRole('group', label)
}

// AC-05.1 card values, shared by TC-28, TC-32 and TC-33.
export async function expectAroundCard(screen: Screen) {
  await expect(row(screen, '대상 자녀')).toContainText('(초5)', { timeout: 15_000 })
  await expect(row(screen, '선호 과목')).toContainText('영어·수학')
  await expect(row(screen, '목표 월 예산')).toContainText('1,000,000원')
  await expect(row(screen, '예산 상한')).toContainText('1,100,000원')
  await expect(row(screen, '밀도')).toContainText('촘촘하게')
}
