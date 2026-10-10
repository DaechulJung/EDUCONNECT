import { expect, test } from 'e2e'

// Foundation (#14, BASE-01.8): through the web server to the API; without a session every
// screen falls back to the login screen. Feature TCs live in their own files (docs/e2e-test.md).
test('세션 없이 첫 화면을 열면 로그인 화면이 보인다', async ({ app, screen }) => {
  await app.open('/')
  await expect(screen.getByRole('heading', '로그인')).toBeVisible()
})

test('세션 없이 보호자·기관 화면 주소로 가면 로그인 화면으로 돌아간다', async ({ app, screen }) => {
  for (const path of ['/chat', '/schedule', '/children', '/academy', '/school', '/impact']) {
    await app.open(path)
    await expect(screen.getByRole('heading', '로그인')).toBeVisible()
  }
})
