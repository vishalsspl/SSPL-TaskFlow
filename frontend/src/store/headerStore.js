import { create } from 'zustand';

export const useHeaderStore = create((set) => ({
    title: '',
    description: '',
    searchTerm: '',
    showSearch: false,
    searchPlaceholder: 'Search...',
    setHeader: (title, description, showSearch = false, placeholder = 'Search...') => 
        set({ title, description, showSearch, searchPlaceholder: placeholder }),
    setSearchTerm: (term) => set({ searchTerm: term }),
    clearHeader: () => set({ title: '', description: '', searchTerm: '', showSearch: false, searchPlaceholder: 'Search...' }),
}));
