export const DASHBOARD_ACCESS_TEXT = {
  preview: {
    kicker: 'Free audit preview',
    title: 'Vidíš len rýchly prehľad problémov',
    lead:
      'Free audit ukazuje skóre, počty a top 3 nálezy. Detailné odporúčania a plný report sú dostupné v základnom audite.'
  },
  payment: {
    kicker: 'Platba',
    title: 'Ďakujeme, platba prebehla.',
    lead:
      'Ak sa prístup ešte neodomkol, kliknite na „Už som zaplatil“ a obnovíme stav z Lemon Squeezy.',
    refreshIdle: 'Už som zaplatil',
    refreshLoading: 'Overujem...'
  },
  upgrade: {
    kicker: 'Základný audit',
    title: 'Odomknite celý report a odporúčania.',
    lead:
      'Po platbe sa vám odomkne plný výstup a export PDF. Posledný free audit sa po potvrdení platby automaticky odomkne.',
    basicCta: 'Audit Basic (99 €)',
    proCta: 'Audit Pro (199 €)'
  },
  paid: {
    kicker: 'Základný audit',
    titleNoCredits: 'Nemáte dostupný kredit.',
    titleWithCredits: 'Máte dostupný kredit na audit.',
    leadNoCredits: 'Objednajte ďalší audit a spravte nový report.',
    leadWithCredits: 'Môžete spustiť audit a získať plný report, odporúčania a export PDF.',
    creditsLabel: 'Kredity',
    addFiveCredits: 'Pridať 5 kreditov',
    addFifteenCredits: 'Pridať 15 kreditov'
  }
} as const

export const DASHBOARD_MONITORING_TEXT = {
  kicker: 'Monitoring',
  title: 'Automatické kontroly viacerých domén',
  loading: 'Načítavam monitoring...',
  summaryFrequency: 'Frekvencia:',
  upgradeToPro: 'Upgrade na Monitoring Pro',
  emptyWithAccess: 'Zatiaľ nemáte monitorovanú doménu. V histórii auditov kliknite na „Monitoruj“.',
  upsellNotice: 'Monitoring plán nie je aktívny.',
  blockedNotice: 'Monitoring je dostupný až po základnom audite.',
  basicCta: 'Monitoring Basic (29 €)',
  proCta: 'Monitoring Pro',
  missingCheckout: 'Monitoring checkout URL nie je nastavená',
  removeLoading: 'Ruším...',
  removeTarget: 'Zrušiť monitoring',
  targetStatusActive: 'Aktívny',
  targetStatusPaused: 'Pozastavený',
  nextAudit: 'Ďalší audit',
  lastAudit: 'Posledný audit',
  badgeLoading: 'Načítavam',
  badgeUpsell: 'Bez plánu',
  badgeBlocked: 'Nedostupné',
  badgeActive: 'Aktívny',
  badgePaused: 'Pozastavený'
} as const

export const DASHBOARD_HERO_TEXT = {
  kicker: 'Dashboard',
  title: 'WCAG cockpit pre produktový tím',
  lead: 'Spustite audit, prioritizujte bariéry a odovzdajte report bez chaosu.',
  tags: ['WCAG 2.1 AA', 'EN 301 549', 'EAA / WAD'],
  workflowTitle: 'Rýchly workflow',
  workflowSteps: [
    'Vložte URL a vyberte profil legislatívy',
    'Spustite audit a vyriešte najkritickejšie nálezy',
    'Zdieľajte report pre vývoj, produkt a compliance'
  ],
  workflowMeta: 'Automatický audit + manuálny checklist'
} as const

export const DASHBOARD_OVERVIEW_TEXT = {
  emptyState: 'Spustite audit a po dokončení sa tu zobrazí prehľad skóre a rozdelenie nálezov.'
} as const

export const DASHBOARD_METRICS_TEXT = {
  ariaLabel: 'Kľúčové metriky',
  scoreTitle: 'Skóre pripravenosti',
  highIssuesTitle: 'Kritické nálezy',
  highIssuesMeta: 'Priorita pre najbližší sprint',
  allIssuesTitle: 'Všetky nálezy',
  filteredIssuesPrefix: 'Filtrovateľných',
  allIssuesFallback: 'Po audite sa doplní',
  latestAuditTitle: 'Posledný audit',
  latestAuditWithHistory: 'Audit história je aktívna',
  latestAuditEmpty: 'Po prvom audite uvidíte históriu'
} as const

export const DASHBOARD_AUDIT_FORM_TEXT = {
  kicker: 'Spustenie auditu',
  title: 'Spusti nový WCAG audit',
  lead: 'Krátky flow v troch krokoch: cieľ, legislatívny profil a spustenie analýzy.',
  stepTargetLabel: 'Webstránka na analýzu',
  stepTargetCopy: 'Zadaj URL stránky, ktorú chceš otestovať.',
  targetPlaceholder: 'https://priklad.sk',
  targetHint: 'Vhodné pre weby, aplikácie aj digitálne služby.',
  stepProfileLabel: 'Profil legislatívy',
  stepProfileCopy: 'Vyberte profil podľa typu organizácie a služby.',
  stepRunLabel: 'Spustenie',
  stepRunCopy: 'Klikni a počkaj na výpočet skóre aj prioritizácie problémov.',
  runLoading: 'Auditujem...',
  runIdle: 'Analyzovať web',
  runHint: 'Po dokončení dostaneš skóre, priority a detailný zoznam nálezov.',
  progressInit: 'Inicializujem audit...',
  progressLoadingPage: 'Načítavam stránku...',
  progressRules: 'Vyhodnocujem pravidlá WCAG...',
  progressSaving: 'Ukladám výsledky...',
  progressDone: 'Audit dokončený'
} as const

export const DASHBOARD_HISTORY_TEXT = {
  loading: 'Načítavam históriu...',
  empty: 'Zatiaľ nemáte žiadne audity.',
  pillPaid: 'Základný audit',
  pillFree: 'Free audit',
  statsTotal: 'Spolu',
  statsHigh: 'Kritické',
  openAudit: 'Zobraziť audit',
  monitorPending: 'Nastavujem...',
  monitorActive: 'Monitorované',
  monitorIdle: 'Monitoruj',
  loadMoreLoading: 'Načítavam ďalšie...',
  loadMoreIdle: 'Načítať ďalšie',
  monitorTooltipNoAccess: 'Pre monitoring si treba zakúpiť predplatné.',
  monitorTooltipAlreadyActive: 'Táto doména je už monitorovaná.',
  monitorTooltipLimit: (limit: number) => `Dosiahli ste limit monitorovaných domén (${limit}).`
} as const

export const DASHBOARD_CORE_TEXT = {
  auditLockedNoCredits: 'Nemáte kredit na základný audit. Objednajte ďalší audit.',
  auditLockedFreeUsed: 'Bezplatný audit už bol použitý. Pre plný report si objednajte základný audit.',
  historyLoadError: 'Históriu auditov sa nepodarilo načítať.',
  profileFallback: 'WCAG audit',
  targetUrlInvalid: 'Zadajte platnú URL (napr. https://priklad.sk).',
  monitoringRemoveSuccess: 'Monitoring domény bol zrušený.',
  monitoringRemoveError: 'Monitoring domény sa nepodarilo zrušiť.',
  monitoringMissingUrl: 'Vybraný audit nemá URL pre monitoring.',
  monitoringNoAccess: 'Monitoring plán nie je aktívny pre tento účet.',
  monitoringAlreadyActive: 'Táto doména je už monitorovaná.',
  monitoringRestoreSuccess: 'Monitoring domény bol obnovený.',
  monitoringRestoreError: 'Monitoring domény sa nepodarilo obnoviť.',
  monitoringNoDomains: 'Monitoring plán pre tento účet nemá dostupné domény.',
  monitoringAddSuccess: 'Doména bola pridaná do monitoringu.',
  monitoringAddError: 'Monitoring domény sa nepodarilo aktivovať.',
  monitoringLimitReached: (limit: number) => `Dosiahli ste limit monitorovaných domén (${limit}).`
} as const

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

export const getDashboardScoreStateLabel = (hasReport: boolean, score: number) => {
  if (!hasReport) return 'Spustite audit'
  if (score >= 90) return 'Vysoká pripravenosť'
  if (score >= 75) return 'Solídny základ'
  if (score >= 60) return 'Treba dorobiť kľúčové opravy'
  return 'Rizikový stav'
}
