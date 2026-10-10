import { beforeEach, expect, test, type App, type Screen } from 'e2e'

// REQ-02 in the browser (FLOW-05): TC-13 (AC-02.1), TC-14 (AC-02.2).
// TC-16~18 need the parent recommendation table (#6); the academy-side halves run here until then.
// The app must run with ENABLE_TEST_ROUTES=1 and the seed password in SEED_PASSWORD.

async function resetSeed(app: App) {
  const response = await fetch(new URL('/api/test/reset', app.baseUrl), { method: 'POST' })
  expect(response.status).toBe(200)
}

async function signInAcademy(app: App, screen: Screen, loginId = 'academy-a') {
  const password = process.env.SEED_PASSWORD
  expect(password, 'SEED_PASSWORD').toBeTruthy()
  await app.open('/login')
  await screen.getByLabel('아이디').fill(loginId)
  await screen.getByLabel('비밀번호').fill(password!)
  await screen.getByRole('button', '로그인').tap()
  await expect(screen.getByRole('heading', '학원 프로그램 관리')).toBeVisible({ timeout: 10_000 })
  await expect(screen.getByRole('table', '학원 프로그램 목록')).toBeVisible({ timeout: 10_000 })
}


async function fillAc021(screen: Screen) {
  await screen.getByLabel('과목').fill('코딩')
  await screen.getByLabel('유형').selectOption('academy')
  await screen.getByLabel('화').check()
  await screen.getByLabel('목').check()
  await screen.getByLabel('시작 시각').fill('16:00')
  await screen.getByLabel('종료 시각').fill('17:00')
  await screen.getByLabel('월 교습비(원)').fill('200000')
  await screen.getByLabel('월 기타경비(원)').fill('20000')
  await screen.getByLabel('강사').fill('코딩 강사')
  await screen.getByLabel('대상 학년(시작)').selectOption('4')
  await screen.getByLabel('대상 학년(끝)').selectOption('6')
  await screen.getByLabel('정원(명)').fill('10')
  await screen.getByLabel('현재 인원(명)').fill('3')
  await screen.getByLabel('위도').fill('37.5012')
  await screen.getByLabel('경도').fill('127.0396')
}

beforeEach(async ({ app }) => {
  await resetSeed(app)
  await app.clearState()
})

test('TC-13 코딩 프로그램을 등록하면 교습비·기타경비가 나뉜 채 목록에 남는다', async ({ app, screen }) => {
  await signInAcademy(app, screen)
  await screen.getByRole('button', '프로그램 등록').tap()
  await fillAc021(screen)
  await screen.getByRole('button', '프로그램 저장').tap()

  const coding = screen.getByRole('table', '학원 프로그램 목록').getByRole('row').filter({ hasText: '코딩' })
  await expect(coding).toHaveCount(1, { timeout: 10_000 })
  await expect(coding).toContainText('200,000원')
  await expect(coding).toContainText('20,000원')
  await expect(coding).toContainText('화·목')
  await expect(coding).toContainText('16:00~17:00')

  await app.restart() // reload: the row comes back from the server
  const reloaded = screen.getByRole('table', '학원 프로그램 목록').getByRole('row').filter({ hasText: '코딩' })
  await expect(reloaded).toHaveCount(1, { timeout: 10_000 })
  await expect(reloaded).toContainText('200,000원')
  await expect(reloaded).toContainText('20,000원')
})

test('TC-14 잘못된 값 4종은 칸 옆 오류를 보이고 목록에 추가되지 않는다', async ({ app, screen }) => {
  await signInAcademy(app, screen)
  const table = screen.getByRole('table', '학원 프로그램 목록')
  const before = await table.getByRole('row').count()
  await screen.getByRole('button', '프로그램 등록').tap()

  const cases: [string, string, string, string][] = [
    ['종료 시각', '15:30', '종료 시각', '종료 시각은 시작 시각보다 늦어야 해요'],
    ['월 교습비(원)', '-1000', '월 교습비(원)', '월 교습비는 0원 이상이어야 해요'],
    ['정원(명)', '0', '정원(명)', '정원은 1명 이상이어야 해요'],
    ['위도', '', '위도', '위도를 입력해 주세요'],
  ]
  for (const [label, value, field, message] of cases) {
    await fillAc021(screen)
    if (label === '정원(명)') await screen.getByLabel('현재 인원(명)').fill('0')
    if (label === '위도') await screen.getByLabel('경도').fill('')
    await screen.getByLabel(label).fill(value)
    await screen.getByRole('button', '프로그램 저장').tap()
    await expect(screen.getByText(message)).toBeVisible()
    await expect(screen.getByLabel(field)).toHaveAttribute('aria-invalid', 'true')
    await expect(table.getByRole('row')).toHaveCount(before)
  }
  await expect(screen.getByText('경도를 입력해 주세요')).toBeVisible()
  await app.restart()
  await expect(screen.getByRole('table', '학원 프로그램 목록').getByRole('row')).toHaveCount(before, { timeout: 10_000 })
})

test('TC-17·18 학원 쪽: 미공개 표시와 삭제 후 목록에서 사라짐 (비교표 확인은 #6)', async ({ app, screen }) => {
  await signInAcademy(app, screen, 'academy-b') // the seed undisclosed program belongs to academy B
  const table = screen.getByRole('table', '학원 프로그램 목록')
  await expect(table.getByRole('row').filter({ hasText: '미공개' })).toHaveCount(1)

  const before = await table.getByRole('row').count()
  const target = table.getByRole('row').filter({ hasText: '미공개' })
  await target.getByRole('button').tap()
  await expect(screen.getByRole('dialog', '이 프로그램을 삭제할까요?')).toBeVisible()
  await screen.getByRole('button', '삭제하기').tap()
  await expect(table.getByRole('row')).toHaveCount(before - 1, { timeout: 10_000 })
  await expect(table.getByRole('row').filter({ hasText: '미공개' })).toHaveCount(0)
})
