import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  imageListViewMode: 'thumb' | 'list' | 'smallThumb';
  setImageListViewMode: (mode: 'thumb' | 'list' | 'smallThumb') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      imageListViewMode: 'thumb',
      setImageListViewMode: (mode) => set({ imageListViewMode: mode }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'sofia-ui-storage',
    }
  )
);
