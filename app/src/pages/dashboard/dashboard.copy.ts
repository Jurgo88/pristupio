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

export const getDashboardScoreStateLabel = (hasReport: boolean, score: number) => {
  if (!hasReport) return 'Spustite audit'
  if (score >= 90) return 'Vysoká pripravenosť'
  if (score >= 75) return 'Solídny základ'
  if (score >= 60) return 'Treba dorobiť kľúčové opravy'
  return 'Rizikový stav'
}
