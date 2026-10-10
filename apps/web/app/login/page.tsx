'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { login } from '@/lib/client'
import { homeFor, loginErrorMessage } from '@/lib/session'
import { ME_KEY } from '@/lib/use-session'

export default function LoginPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const { data, error: body } = await login({ body: { login_id: loginId, password } })
    setPending(false)
    if (!data) {
      setError(loginErrorMessage((body as { detail?: unknown } | undefined)?.detail))
      return
    }
    queryClient.setQueryData(ME_KEY, data)
    router.replace(homeFor(data.role))
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--background-default)' }}>
      <main style={{ maxWidth: 480, marginInline: 'auto', paddingInline: 'var(--margin-platform)', paddingBlock: 'var(--space-64)', display: 'flex', flexDirection: 'column', gap: 'var(--space-40)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <p className="aidx-eyebrow">EDUCONNECT <span className="aidx-eyebrow__sep">|</span> 모두의 AI 교육 에이전트</p>
          <h1 className="heading-large-bold font-brand" style={{ margin: 0 }}>로그인</h1>
          <p className="body-medium-medium" style={{ color: 'var(--text-secondary-01)', margin: 0 }}>보호자·학원 담당자·학교 담당자 계정으로 들어가요.</p>
        </div>
        <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
          <label className="kds-field">
            <span className="kds-field__label">아이디</span>
            <input className="kds-field__input" name="login_id" autoComplete="username" value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
          </label>
          <label className={`kds-field${error ? ' kds-field--error' : ''}`}>
            <span className="kds-field__label">비밀번호</span>
            <input className="kds-field__input" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined} />
            {error && <span className="kds-field__helper" id="login-error" role="alert">{error}</span>}
          </label>
          <button className="kds-button" type="submit" disabled={pending || !loginId || !password}>
            {pending ? '확인하고 있어요' : '로그인'}
          </button>
        </form>
      </main>
    </div>
  )
}
