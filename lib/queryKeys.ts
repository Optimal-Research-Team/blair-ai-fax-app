export const queryKeys = {
  faxes: {
    all: ['faxes'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.faxes.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.faxes.all, 'detail', id] as const,
  },
  referrals: {
    all: ['referrals'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.referrals.all, 'list', filters] as const,
    detail: (id: string) =>
      [...queryKeys.referrals.all, 'detail', id] as const,
  },
  communications: {
    all: ['communications'] as const,
    list: (referralId: string) =>
      [...queryKeys.communications.all, 'list', referralId] as const,
  },
  settings: {
    all: ['settings'] as const,
    documentCategories: () =>
      [...queryKeys.settings.all, 'documentCategories'] as const,
    faxLines: () => [...queryKeys.settings.all, 'faxLines'] as const,
  },
}
