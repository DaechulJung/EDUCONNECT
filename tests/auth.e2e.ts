import { expect, type App, type Screen } from 'e2e'
import { beforeEach, test } from '@e2e-dev/web'
import { asOrg } from './viewport'

// REQ-01 in the browser: TC-01 (AC-01.1), TC-02 (AC-01.2), TC-10 (AC-01.10).
// The app must run with ENABLE_TEST_ROUTES=1 and the seed password in SEED_PASSWORD.
const WRONG_CREDENTIALS = '아이디 또는 비밀번호가 올바르지 않습니다'

async function resetSeed(app: App) {
  const response = await fetch(new URL('/api/test/reset', app.baseUrl), { method: 'POST' })
  expect(response.status).toBe(200)
}

function seedPassword(): string {
  const password = process.env.SEED_PASSWORD
  expect(password, 'SEED_PASSWORD').toBeTruthy()
  return password!
}

async function signIn(app: App, screen: Screen, loginId: string, password: string) {
  await app.open('/login')
  await screen.getByLabel('아이디').fill(loginId)
  await screen.getByLabel('비밀번호').fill(password)
  await screen.getByRole('button', '로그인').tap()
}

async function expectParentHome(screen: Screen) {
  await expect(screen.getByRole('navigation', '하단 메뉴')).toBeVisible({ timeout: 10_000 })
  await expect(screen.getByRole('link', '챗봇')).toHaveAttribute('aria-current', 'page')
  await expect(screen.getByRole('heading', '로그인')).not.toBeVisible()
}

beforeEach(async ({ app }) => {
  await resetSeed(app)
  await app.clearState()
})

test('TC-01 시드 계정 3종이 각자 첫 화면으로 들어간다', async ({ app, screen, browser }) => {
  await signIn(app, screen, 'parent1', seedPassword())
  await expectParentHome(screen)

  // Academy and school screens at the desktop width (prd 4.2).
  await asOrg(browser)
  await app.clearState()
  await signIn(app, screen, 'academy-a', seedPassword())
  await expect(screen.getByRole('heading', '학원 프로그램 관리')).toBeVisible({ timeout: 10_000 })

  await app.clearState()
  await signIn(app, screen, 'school-elem', seedPassword())
  await expect(screen.getByRole('heading', '학교 시간표 관리')).toBeVisible({ timeout: 10_000 })
})

test('TC-02 틀린 비밀번호는 문구를 보이고 세션 쿠키를 주지 않는다', async ({ app, screen }) => {
  await signIn(app, screen, 'parent1', 'wrong-password')
  // Next.js also renders an empty route-announcer alert, so pick the alert by its text.
  await expect(screen.getByRole('alert').filter({ hasText: WRONG_CREDENTIALS })).toBeVisible({ timeout: 10_000 })
  await expect(screen.getByRole('heading', '로그인')).toBeVisible()

  // The same request the screen sends: 401 and no Set-Cookie.
  const response = await fetch(new URL('/api/auth/login', app.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login_id: 'parent1', password: 'wrong-password' }),
  })
  expect(response.status).toBe(401)
  expect(response.headers.get('set-cookie')).toBeNull()
})

test('TC-10 새로 고침하거나 다른 탭에 다녀와도 로그인 화면이 다시 나오지 않는다', async ({ app, screen }) => {
  await signIn(app, screen, 'parent1', seedPassword())
  await expectParentHome(screen)

  await app.restart() // reload with the same cookies
  await expectParentHome(screen)

  await screen.getByRole('link', '일정').tap()
  await expect(screen.getByRole('link', '일정')).toHaveAttribute('aria-current', 'page', { timeout: 10_000 })
  await expect(screen.getByRole('heading', '로그인')).not.toBeVisible()
  await screen.getByRole('link', '챗봇').tap()
  await expectParentHome(screen)
})
