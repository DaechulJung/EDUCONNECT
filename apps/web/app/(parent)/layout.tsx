'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/kds/kds'
import { getMeta } from '@/lib/client'
import { useLogout, useRoleGuard } from '@/lib/use-session'

const TABS = [
  { href: '/chat', label: '챗봇', line: 'ic-line-new_chat', fill: 'ic-line-new_chat' },
  { href: '/schedule', label: '일정', line: 'ic-line-calendar', fill: 'ic-line-calendar' },
  { href: '/children', label: '자녀', line: 'ic-line-my', fill: 'ic-fill-my' },
] as const

// Parent frame (final form, arch AD-3): header with the /api/meta slot, bottom tabs, logout.
export default function ParentLayout({ children }: LayoutProps<'/'>) {
  const me = useRoleGuard(['parent'])
  const pathname = usePathname()
  const onLogout = useLogout()
  const meta = useQuery({
    queryKey: ['meta'],
    queryFn: async () => (await getMeta()).data ?? null,
    enabled: !!me,
    staleTime: Infinity,
  })
  if (!me) return null

  return (
    <div data-mode="agent" style={{ minHeight: '100dvh', background: 'var(--background-default)' }}>
      <div style={{ maxWidth: 480, minHeight: '100dvh', marginInline: 'auto', display: 'flex', flexDirection: 'column' }}>
        <header className="kds-topnav">
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <h1 className="kds-topnav__title" style={{ margin: 0 }}>
              {meta.data ? `${meta.data.service_name} · ${meta.data.subtitle}` : 'EDUCONNECT'}
            </h1>
            {meta.data && (
              <p className="caption-medium-medium" style={{ margin: 0, color: 'var(--text-secondary-01)', display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
                <span>모두의 AI 연동</span>
                <span className="kds-tag kds-tag--info">{meta.data.modu_ai_status === 'mock' ? '모의' : meta.data.modu_ai_status}</span>
              </p>
            )}
          </div>
          <div className="kds-topnav__actions">
            <button className="kds-button kds-button--tertiary kds-button--small" type="button" onClick={onLogout}>로그아웃</button>
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
        <nav className="kds-bottomnav caption-medium-medium" aria-label="하단 메뉴" style={{ position: 'sticky', bottom: 0 }}>
          {TABS.map((tab) => {
            const current = pathname.startsWith(tab.href)
            return (
              <Link key={tab.href} href={tab.href} aria-current={current ? 'page' : undefined}>
                <Icon name={current ? tab.fill : tab.line} />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
