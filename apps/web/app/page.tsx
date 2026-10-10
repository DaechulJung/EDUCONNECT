'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { homeFor } from '@/lib/session'
import { useMe } from '@/lib/use-session'

// Entry: the role's first screen when logged in, otherwise the login screen.
export default function Entry() {
  const router = useRouter()
  const me = useMe()
  useEffect(() => {
    if (me.isSuccess) router.replace(me.data ? homeFor(me.data.role) : '/login')
  }, [me.isSuccess, me.data, router])
  return (
    <main className="kds-container" style={{ paddingBlock: 'var(--space-40)' }} aria-busy="true">
      <p className="kds-info-line">확인하고 있어요</p>
    </main>
  )
}
