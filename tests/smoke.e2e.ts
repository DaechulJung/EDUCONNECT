import { expect, test } from 'e2e'

// Starting screen, through the web server to the API, the database and Redis.
// Replace it with the real TCs once docs/e2e-test.md lists them.
test('첫 화면이 데이터베이스·벡터 검색·Redis 연결을 보여 준다', async ({ app, screen }) => {
  await app.open('/')
  await expect(screen.getByRole('heading', '서비스 상태')).toBeVisible()
  await expect(screen.getByText('연결됨')).toHaveCount(3)
})
