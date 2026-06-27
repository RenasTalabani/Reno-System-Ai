'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FavoriteItem {
  href: string
  label: string
  icon?: string
  addedAt: string
}

interface FavoritesStore {
  favorites: FavoriteItem[]
  addFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void
  removeFavorite: (href: string) => void
  isFavorite: (href: string) => boolean
  toggleFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void
}

export const useFavorites = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (item) =>
        set((s) => ({
          favorites: s.favorites.some((f) => f.href === item.href)
            ? s.favorites
            : [{ ...item, addedAt: new Date().toISOString() }, ...s.favorites].slice(0, 20),
        })),

      removeFavorite: (href) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f.href !== href) })),

      isFavorite: (href) => get().favorites.some((f) => f.href === href),

      toggleFavorite: (item) => {
        const { isFavorite, addFavorite, removeFavorite } = get()
        if (isFavorite(item.href)) removeFavorite(item.href)
        else addFavorite(item)
      },
    }),
    { name: 'reno-favorites' },
  ),
)
