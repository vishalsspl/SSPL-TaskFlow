import { create } from 'zustand';

export const useHeaderStore = create((set) => ({
    title: '',
    description: '',
    searchTerm: '',
    showSearch: false,
    searchPlaceholder: 'Search...',
    setHeader: (title, description, options = {}) => {
        if (typeof options === 'boolean') {
            set({ title, description, showSearch: options, searchPlaceholder: 'Search...' });
        } else {
            set({ 
                title, 
                description, 
                showSearch: options.showSearch ?? false, 
                searchPlaceholder: options.searchPlaceholder ?? 'Search...' 
            });
        }
    },
    setSearchTerm: (term) => set({ searchTerm: term }),
    clearHeader: () => set({ title: '', description: '', searchTerm: '', showSearch: false, searchPlaceholder: 'Search...' }),
}));
