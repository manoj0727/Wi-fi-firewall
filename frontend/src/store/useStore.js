import { create } from 'zustand';

const useStore = create((set) => ({
  // Stats
  stats: {
    totalQueries: 0,
    blockedQueries: 0,
    allowedQueries: 0,
    queryHistory: [],
    topBlockedDomains: [],
    topAllowedDomains: [],
    devices: []
  },
  setStats: (stats) => set({ stats }),

  // Rules
  rules: [],
  setRules: (rules) => set({ rules }),
  addRule: (rule) => set((state) => ({ rules: [...state.rules, rule] })),
  updateRule: (id, updatedRule) => set((state) => ({
    rules: state.rules.map(rule => rule.id === id ? { ...rule, ...updatedRule } : rule)
  })),
  deleteRule: (id) => set((state) => ({
    rules: state.rules.filter(rule => rule.id !== id)
  })),

  // Blocked domains
  blockedDomains: [],
  setBlockedDomains: (domains) => set({ blockedDomains: domains }),
  addBlockedDomain: (domain) => set((state) => ({
    blockedDomains: [...state.blockedDomains, domain]
  })),
  removeBlockedDomain: (domain) => set((state) => ({
    blockedDomains: state.blockedDomains.filter(d => d !== domain)
  })),

  // Query history
  queryHistory: [],
  addQueryToHistory: (query) => set((state) => ({
    queryHistory: [query, ...state.queryHistory].slice(0, 1000)
  })),

  // Connection status
  isConnected: false,
  setConnectionStatus: (status) => set({ isConnected: status })
}));

export default useStore;