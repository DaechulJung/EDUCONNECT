import { beforeEach, expect, test, type Screen } from 'e2e'
import { resetSeed, signInParent } from './chat-support'
import { makePlan, minutes, saveConditions, week } from './plan-support'

// REQ-04 in the browser (FLOW-04, mobile width): TC-23 (AC-04.1), TC-24 (AC-04.2), TC-25 (AC-04.3), TC-26 (AC-04.4).
// The app must run with ENABLE_TEST_ROUTES=1 and the seed password in SEED_PASSWORD.

const MOBILE = { width: 390, height: 844 }

beforeEach(async ({ app, browser }) => {
  await resetSeed(app)
  await browser.setViewport(MOBILE)
})

async function openForm(app: Parameters<typeof signInParent>[0], screen: Screen) {
  await signInParent(app, screen)
  await app.open('/children')
  await expect(screen.getByRole('table', '자녀 목록')).toBeVisible({ timeout: 10_000 }) // seed child
  await screen.getByRole('button', '자녀 등록').tap()
  await expect(screen.getByRole('dialog', '자녀 정보를 입력해 주세요')).toBeVisible()
}

// AC-04.1 values (alias is unique to this run so the seed child cannot satisfy the check).
async function fillAc041(screen: Screen, alias: string, age = '11') {
  await screen.getByLabel('별칭').fill(alias)
  await screen.getByLabel('만 나이').fill(age)
  await screen.getByLabel('학년').selectOption('초5')
  await screen.getByLabel('학교').selectOption('한빛초등학교')
  await screen.getByLabel('관심사').fill('과학')
  await screen.getByLabel('교육 목표').fill('수학 심화')
  await screen.getByRole('button', '기존 일정 추가').tap()
  await screen.getByLabel('요일').selectOption('토')
  await screen.getByLabel('시작').fill('10:00')
  await screen.getByLabel('끝').fill('12:00')
  await screen.getByLabel('내용').fill('수영')
}

const childRow = (screen: Screen, alias: string) =>
  screen.getByRole('table', '자녀 목록').getByRole('row').filter({ hasText: alias })

test('TC-23 자녀 탭에서 AC-04.1 값으로 저장하면 자녀 목록에 별칭과 학년이 보이고 새로 고쳐도 같다', async ({ app, screen, browser }) => {
  const alias = `별${Date.now() % 100000}`
  await openForm(app, screen)
  await fillAc041(screen, alias)
  await screen.getByLabel('법정대리인 동의 확인(모의)').check()
  await screen.getByRole('button', '자녀 저장').tap()

  const row = childRow(screen, alias)
  await expect(row).toHaveCount(1, { timeout: 10_000 })
  await expect(row).toContainText('초5')
  await expect(row).toContainText('토 10:00~12:00 수영')

  await app.open('/children')
  await expect(childRow(screen, alias)).toHaveCount(1, { timeout: 10_000 })
  await expect(childRow(screen, alias)).toContainText('초5')

  // The list shows only alias and grade, so check the stored school against the one picked by name.
  const { schools, children } = await browser.evaluate(async () => ({
    schools: await (await fetch('/api/catalog/schools')).json(),
    children: await (await fetch('/api/children')).json(),
  })) as { schools: { id: string; name: string }[]; children: { alias: string; school_id: string | null }[] }
  const picked = schools.find((school) => school.name === '한빛초등학교')
  expect(picked).toBeTruthy()
  expect(children.find((child) => child.alias === alias)?.school_id).toBe(picked!.id)
})

test('TC-25 만 나이 13이면 동의 확인 전 저장 버튼이 비활성이고 안내가 보이며, 체크하면 저장된다', async ({ app, screen }) => {
  const alias = `동${Date.now() % 100000}`
  await openForm(app, screen)
  await fillAc041(screen, alias, '13')

  const save = screen.getByRole('button', '자녀 저장')
  await expect(save).toBeDisabled()
  await expect(screen.getByText('법정대리인 동의 확인이 필요합니다')).toBeVisible()
  await screen.getByLabel('법정대리인 동의 확인(모의)').check()
  await expect(screen.getByText('법정대리인 동의 확인이 필요합니다')).not.toBeVisible()
  await expect(save).toBeEnabled()
  await save.tap()

  await expect(childRow(screen, alias)).toHaveCount(1, { timeout: 10_000 })
})

test('TC-26 자녀 등록 화면에 실명·연락처 칸이 없고 저장 API 응답에도 실명·연락처 항목이 없다', async ({ app, screen, browser }) => {
  const alias = `실${Date.now() % 100000}`
  await openForm(app, screen)
  const form = screen.getByRole('dialog', '자녀 정보를 입력해 주세요')
  for (const label of ['이름', '실명', '성명', '연락처', '전화번호', '휴대폰', '이메일']) {
    await expect(form.getByLabel(label, { exact: true })).toHaveCount(0)
  }
  await expect(form.getByRole('textbox')).toHaveCount(4) // 별칭·만 나이·관심사·교육 목표 (no existing-event row yet)

  await fillAc041(screen, alias)
  await screen.getByLabel('법정대리인 동의 확인(모의)').check()
  const saved = browser.waitForResponse(/\/api\/children$/)
  await screen.getByRole('button', '자녀 저장').tap()
  const response = await saved
  expect(response.status).toBe(201)
  const body = await response.json<Record<string, unknown>>()
  expect(body.alias).toBe(alias)
  expect(Object.keys(body).sort()).toEqual(
    ['age', 'alias', 'consent_checked', 'existing_events', 'goal', 'grade', 'id', 'interests', 'manual_dismissal', 'school_id'],
  )
})

test('TC-24 토 10:00~12:00 기존 일정이 있는 자녀로 일정을 만들면 그 시간에 다른 수업이 없다', async ({ app, screen, browser }) => {
  const alias = `토${Date.now() % 100000}`
  await openForm(app, screen)
  await fillAc041(screen, alias)
  await screen.getByLabel('법정대리인 동의 확인(모의)').check()
  await screen.getByRole('button', '자녀 저장').tap()
  await expect(childRow(screen, alias)).toHaveCount(1, { timeout: 10_000 })

  await browser.setViewport({ width: 1280, height: 900 }) // week() reads the desktop weekly table
  await app.open('/chat')
  await saveConditions(app, screen, async (sheet) => {
    await sheet.getByLabel(`${alias}(초5)`).check()
  })
  await expect(screen.getByRole('article', '조건 카드').getByRole('group', '대상 자녀')).toContainText(alias)
  await makePlan(screen)
  const days = await week(screen)
  expect(days.flatMap((d) => d.classes).length, '일정이 만들어짐').toBeGreaterThan(0)
  const saturday = days.find((d) => d.day === '토')!
  for (const c of saturday.classes) {
    const overlaps = minutes(c.start) < minutes('12:00') && minutes(c.end) > minutes('10:00')
    expect(overlaps, `토 ${c.text}`).toBe(false)
  }
})
