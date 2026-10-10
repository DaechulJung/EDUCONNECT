import { expect, test } from 'vitest'
import { guard, homeFor, loginErrorMessage } from './session'
import type { Me } from './client'

const parent: Me = { account_id: 'a', login_id: 'p', role: 'parent', institution_id: null }
const academy: Me = { account_id: 'b', login_id: 'h', role: 'academy', institution_id: 'i' }

test('역할마다 첫 화면이 정해져 있다', () => {
  expect(homeFor('parent')).toBe('/chat')
  expect(homeFor('academy')).toBe('/academy')
  expect(homeFor('school')).toBe('/school')
})

test('세션이 없거나 역할이 맞지 않으면 로그인 화면으로 보낸다', () => {
  expect(guard(null, ['parent'])).toEqual({ kind: 'login' })
  expect(guard(academy, ['parent'])).toEqual({ kind: 'login' })
  expect(guard(parent, ['parent'])).toEqual({ kind: 'allow', me: parent })
  expect(guard(academy, ['academy', 'school'])).toEqual({ kind: 'allow', me: academy })
})

test('로그인 오류 코드는 정해진 문구로만 보인다', () => {
  expect(loginErrorMessage('invalid_credentials')).toBe('아이디 또는 비밀번호가 올바르지 않습니다')
  expect(loginErrorMessage('account_locked')).toBe('로그인 시도가 많아 15분 동안 잠겼습니다')
  expect(loginErrorMessage('server_error')).toBe('로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요')
  expect(loginErrorMessage([{ msg: 'x' }])).toBe('로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요')
})
