'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export interface RecentItem {
  href: string
  label: string
  viewedAt: string
}

interface RecentStore {
  recent: RecentItem[]
  addRecent: (item: Omit<RecentItem, 'viewedAt'>) => void
  clearRecent: () => void
}

export const useRecentlyViewed = create<RecentStore>()(
  persist(
    (set) => ({
      recent: [],

      addRecent: (item) =>
        set((s) => ({
          recent: [
            { ...item, viewedAt: new Date().toISOString() },
            ...s.recent.filter((r) => r.href !== item.href),
          ].slice(0, 15),
        })),

      clearRecent: () => set({ recent: [] }),
    }),
    { name: 'reno-recently-viewed' },
  ),
)

export function useTrackPageView(label: string) {
  const pathname = usePathname()
  const addRecent = useRecentlyViewed((s) => s.addRecent)

  useEffect(() => {
    if (pathname && label) {
      addRecent({ href: pathname, label })
    }
  }, [pathname, label, addRecent])
}
