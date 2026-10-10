'use client'
/* eslint-disable @next/next/no-img-element -- KDS kit images are static files from public/kds */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/lib/session'
import { useLogout, useRoleGuard } from '@/lib/use-session'

const MENU: { href: string; label: string; roles: readonly Role[] }[] = [
  { href: '/academy', label: '프로그램', roles: ['academy'] },
  { href: '/school', label: '시간표', roles: ['school'] },
  { href: '/impact', label: '영향 확인', roles: ['academy', 'school'] },
]

// Organization console frame (final form, arch AD-3): GNB, sidebar menu, logout.
export default function OrgLayout({ children }: LayoutProps<'/'>) {
  const me = useRoleGuard(['academy', 'school'])
  const pathname = usePathname()
  const onLogout = useLogout()
  if (!me) return null
  const menu = MENU.filter((item) => item.roles.includes(me.role))

  return (
    <div data-platform="desktop" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header className="kds-gnb">
        <div className="kds-container kds-gnb__inner">
          <img className="kds-gnb__logo" src="/kds/images/logo_kt.svg" alt="KT" />
          <span className="title-medium-bold">EDUCONNECT</span>
          <div className="kds-gnb__actions" style={{ marginLeft: 'auto' }}>
            <span className="body-small-medium" style={{ color: 'var(--text-secondary-01)' }}>{me.role === 'academy' ? '학원 담당자' : '학교 담당자'}</span>
            <button className="kds-button kds-button--tertiary kds-button--small" type="button" onClick={onLogout}>로그아웃</button>
            <img className="aidx-wordmark" src="/kds/brand/aidx/aidx-day-hackathon.png" alt="AID·X Day & Hackathon" />
          </div>
        </div>
      </header>
      <div style={{ flex: 1, display: 'flex', width: '100%', maxWidth: 1480, marginInline: 'auto' }}>
        <nav className="kds-lnb" aria-label="기관 메뉴">
          <p className="kds-lnb__group">{me.role === 'academy' ? '학원 관리' : '학교 관리'}</p>
          {menu.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? 'page' : undefined}>{item.label}</Link>
          ))}
        </nav>
        <main style={{ flex: 1, minWidth: 0, maxWidth: 1200, paddingInline: 'var(--space-24)', paddingBlock: 'var(--space-40)', display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
          {children}
        </main>
      </div>
      <footer className="kds-footer"><div className="kds-container"><p className="caption-medium-medium">EDUCONNECT · 예시 데이터</p></div></footer>
    </div>
  )
}
