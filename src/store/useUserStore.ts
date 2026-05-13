import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  likedProductIds: string[];
  toggleLike: (productId: string) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
        }
        set({ theme });
      },
      likedProductIds: [],
      toggleLike: (productId) => set((state) => ({
        likedProductIds: state.likedProductIds.includes(productId)
          ? state.likedProductIds.filter((id) => id !== productId)
          : [...state.likedProductIds, productId],
      })),
    }),
    {
      name: 'keep-user-storage',
    }
  )
);
