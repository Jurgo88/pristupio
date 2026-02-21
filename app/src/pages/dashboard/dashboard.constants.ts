export const DASHBOARD_ISSUES_TEXT = {
  kicker: 'Nálezy',
  title: 'Nájdené problémy (WCAG 2.1)',
  exportIdle: 'Export PDF',
  exportLoading: 'Exportujem...',
  exportGenerating: 'Generujem PDF...',
  principleLabel: 'Princíp',
  impactLabel: 'Závažnosť',
  searchLabel: 'Hľadať',
  allOption: 'Všetky',
  searchPlaceholder: 'Napr. kontrast, tlačidlo, aria',
  clearFilters: 'Zrušiť filtre',
  shownFindings: 'Zobrazené nálezy',
  totalPrefix: 'celkovo',
  loadMoreFindings: 'Načítať ďalšie nálezy',
  emptyNoReport: 'Spustite audit, aby sa zobrazili nálezy a detailné odporúčania.',
  emptyNoIssues: 'Nenašli sa žiadne prístupnostné chyby.',
  emptyNoFilteredIssues: 'Žiadne chyby pre vybrané filtre.'
} as const

export const DASHBOARD_IMPACT_TEXT = {
  high: 'Kritické a závažné',
  moderate: 'Stredné',
  minor: 'Menšie'
} as const

export const DASHBOARD_STATS_TEXT = {
  highMeta: 'Najvyššia priorita',
  moderateMeta: 'Vyžaduje plán opráv',
  minorMeta: 'Nižší dopad'
} as const

export const DASHBOARD_REPORT_PREVIEW_TEXT = {
  kicker: 'Prehľad reportu',
  title: 'Index pripravenosti',
  lead: 'Skóre vychádza z pomeru závažností problémov. Čím menej kritických nálezov, tým vyššia pripravenosť.',
  accessibilityLabel: 'Prístupnosť',
  issuesSuffix: 'problémov'
} as const

export const IMPACT_OPTIONS = [
  { value: 'critical', label: 'Kritické' },
  { value: 'serious', label: 'Závažné' },
  { value: 'moderate', label: 'Stredné' },
  { value: 'minor', label: 'Menšie' }
] as const

export const IMPACT_LABELS = {
  critical: 'Kritické',
  serious: 'Závažné',
  moderate: 'Stredné',
  minor: 'Menšie'
} as const
