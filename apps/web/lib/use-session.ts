'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { logout, me as getMe, type Me } from './client'
import { guard, type Role } from './session'

export const ME_KEY = ['auth', 'me'] as const

// Who is logged in: null on 401 (no session, logged out, expired).
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<Me | null> => {
      const { data } = await getMe()
      return data ?? null
    },
    staleTime: 60_000,
  })
}

// Layout guard: sends anyone without a session or with another role to the login screen.
export function useRoleGuard(allowed: readonly Role[]) {
  const router = useRouter()
  const query = useMe()
  const result = query.isSuccess ? guard(query.data, allowed) : null
  useEffect(() => {
    if (result?.kind === 'login') router.replace('/login')
  }, [result?.kind, router])
  return result?.kind === 'allow' ? result.me : null
}

export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await logout()
    queryClient.clear()
    router.replace('/login')
  }
}
