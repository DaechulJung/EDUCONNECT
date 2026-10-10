import type { Me } from './client'

export type Role = Me['role']

// First screen per role (experience 'Information Architecture').
export const HOME: Record<Role, string> = { parent: '/chat', academy: '/academy', school: '/school' }

export function homeFor(role: Role): string {
  return HOME[role]
}

// Business error codes from the API (arch AD-13) → experience wording. Never show raw text.
const LOGIN_ERRORS: Record<string, string> = {
  invalid_credentials: '아이디 또는 비밀번호가 올바르지 않습니다',
  account_locked: '로그인 시도가 많아 15분 동안 잠겼습니다',
}

export function loginErrorMessage(code: unknown): string {
  return (typeof code === 'string' && LOGIN_ERRORS[code]) || '로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요'
}

export type GuardResult = { kind: 'allow'; me: Me } | { kind: 'login' }

// Client-side guard only: the server decides every permission (arch AD-8).
export function guard(me: Me | null | undefined, allowed: readonly Role[]): GuardResult {
  if (!me || !allowed.includes(me.role)) return { kind: 'login' }
  return { kind: 'allow', me }
}
