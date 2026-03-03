export type HomeLocale = 'sk' | 'en'

export const HOME_COPY = {
  sk: {
    hero: {
      eyebrow: 'Prístupnosť bez chaosu',
      title: 'WCAG audit, ktorý dáva tímu jasný plán a istotu pri kontrole.',
      lead:
        'Pristupio používa automatický sken podľa WCAG 2.1 AA a EN 301 549. Dostanete prioritizované chyby, konkrétne odporúčania a report pripravený na EAA aj WAD.',
      primaryCta: 'Získať free audit',
      secondaryCta: 'Pozrieť ceny',
      note: 'Free audit ukáže skóre, počty a top 3 nálezy. Plné reporty získate v platených balíkoch.',
      meta: ['WCAG 2.1 AA', 'EN 301 549', 'EAA 2019/882', 'WAD 2016/2102'],
      proof: [
        {
          title: 'Audit s jasným výstupom',
          text: 'Prioritizované chyby a odporúčania pre opravy.'
        },
        {
          title: 'Priorita podľa dopadu',
          text: 'Najprv riešite bariéry, ktoré blokujú používateľov.'
        },
        {
          title: 'Report pre celý tím',
          text: 'Výstup zrozumiteľný pre compliance, produkt aj vývoj.'
        }
      ],
      mockup: {
        title: 'Audit report',
        pill: 'WCAG 2.1 AA',
        scoreLabel: 'Prístupnosť',
        scoreSubLabel: 'Index pripravenosti',
        bars: [
          { label: 'Critical', count: '12 problémov' },
          { label: 'Moderate', count: '18 problémov' },
          { label: 'Minor', count: '9 problémov' }
        ],
        findings: [
          { title: 'Nedostatočný kontrast textu', wcag: 'WCAG 1.4.3' },
          { title: 'Chýbajúce aria-labels', wcag: 'WCAG 4.1.2' },
          { title: 'Nesprávna hierarchia nadpisov', wcag: 'WCAG 1.3.1' }
        ]
      },
      floatingCard: {
        title: 'Pripravenosť na legislatívu',
        items: ['WAD 2016/2102', 'EAA 2019/882', 'EN 301 549']
      }
    },
    benefits: {
      kicker: 'Prečo na tom záleží',
      title: 'Prístupnosť chráni ľudí, znižuje riziko a posilňuje vašu značku.',
      lead:
        'Nedostupné rozhranie znamená stratených používateľov, právne riziko aj reputačný problém. Pristupio vám dá kontrolu, jasné priority a komunikáciu zrozumiteľnú pre celý tím.',
      cards: [
        {
          title: 'Čo tým získate',
          items: [
            'Jasný plán opráv podľa dopadu na používateľov.',
            'Report, ktorý pochopí compliance aj vývoj.',
            'Rýchly prehľad o stave prístupnosti.'
          ]
        },
        {
          title: 'Pred čím vás to chráni',
          items: [
            'Riziko sankcií pri EAA a WAD kontrolách.',
            'Negatívne reakcie verejnosti a poškodenie značky.',
            'Dodatočné náklady na chaotické opravy.'
          ]
        },
        {
          title: 'Komu to pomáha',
          items: [
            'Používateľom so zrakovým, sluchovým aj motorickým znevýhodnením.',
            'Produktovým tímom, ktoré potrebujú jasné priority.',
            'Compliance a právnym oddeleniam.'
          ]
        }
      ]
    },
    value: {
      kicker: 'Čo získate',
      title: 'Prehľadné výstupy pre compliance aj produkt.',
      lead: 'Získajte jasný obraz o stave prístupnosti a plán opráv, ktorý je zrozumiteľný pre celý tím.',
      cards: [
        {
          title: 'Kritické chyby ako prvé',
          text: 'Automaticky triedime podľa dopadu na používateľov aj rizika pre organizáciu.',
          iconPaths: ['M4 12h16', 'M4 7h10', 'M4 17h7', 'M17 9l2 2 4-4']
        },
        {
          title: 'Legislatívny kontext',
          text: 'Každý nález je spojený s WCAG kritériom a relevantným rámcom EAA/WAD.',
          iconPaths: ['M12 3l8 4v6c0 4-3 7-8 8-5-1-8-4-8-8V7l8-4z', 'M9 12l2 2 4-4']
        },
        {
          title: 'Akčné odporúčania',
          text: 'Praktické kroky pre vývoj a obsah, nie len všeobecné rady.',
          iconPaths: ['M4 4h16v12H7l-3 3V4z', 'M7 8h10', 'M7 12h6']
        }
      ]
    },
    workflow: {
      kicker: 'Ako to funguje',
      title: 'Tri kroky k auditom, ktoré obstáli aj pri kontrole.',
      steps: [
        {
          number: '01',
          title: 'Zadajte URL a vyberte profil',
          text: 'WAD pre verejný sektor alebo EAA pre služby a produkty.'
        },
        {
          number: '02',
          title: 'Spustite audit',
          text: 'Automatický sken vyhodnotí chyby a vypočíta skóre.'
        },
        {
          number: '03',
          title: 'Zdieľajte report',
          text: 'Výstup pre celý tím s jasným plánom opráv.'
        }
      ]
    },
    pricing: {
      kicker: 'Cenník',
      title: 'Balíky auditu a monitoringu podľa rozsahu.',
      lead: 'Free audit je jednorazovo pre 1 doménu. Platené balíky fungujú na kreditoch/doménach podľa zvoleného plánu.',
      ariaLabel: 'Typ cenníka',
      switchAudit: 'Audit',
      switchMonitoring: 'Monitoring',
      subheadAudit: 'Audit',
      subheadMonitoring: 'Monitoring (po základnom audite)',
      summary:
        'Audit kredity sa odpočítavajú za každý nový audit domény. Monitoring plány sú dostupné po základnom audite a limity/frekvencia sa riadia zvoleným tierom.',
      auditPlans: [
        {
          title: 'Free audit',
          price: '0 €',
          subtitle: '1 audit / 1 doména',
          features: ['Skóre prístupnosti', 'Top nálezy pre rýchly prehľad', 'Jednorazovo pre 1 doménu'],
          ctaLabel: 'Spustiť free audit',
          ctaClass: 'btn btn-outline-dark'
        },
        {
          title: 'Audit Basic',
          price: '99 €',
          subtitle: '5 kreditov / 5 domén',
          features: ['Plný report + odporúčania', '5 audit kreditov', 'Pre 5 domén'],
          ctaLabel: 'Objednať Basic',
          ctaClass: 'btn btn-outline-dark',
          badge: 'Najobľúbenejší',
          featured: true
        },
        {
          title: 'Audit Pro',
          price: '199 €',
          subtitle: '15 kreditov / 15 domén',
          features: ['Plný report + odporúčania', '15 audit kreditov', 'Pre 15 domén'],
          ctaLabel: 'Objednať Pro',
          ctaClass: 'btn btn-primary',
          badge: 'Najvýhodnejší',
          featured: true
        },
        {
          title: 'Hĺbkový audit',
          price: 'od 499 €',
          subtitle: 'Manuálny + expertný audit',
          features: ['Detailný manuálny audit', 'Checklist povinností', 'Konzultácia s expertom'],
          ctaLabel: 'Dohodnúť riešenie',
          ctaClass: 'btn btn-outline-dark'
        },
        {
          title: 'Audit Enterprise',
          price: 'Na dohodu',
          subtitle: 'Individuálne riešenie',
          features: ['Vlastný rozsah domén', 'SLA a dedikovaná podpora', 'Proces podľa interných požiadaviek'],
          ctaLabel: 'Dohodnúť riešenie',
          ctaClass: 'btn btn-outline-dark'
        }
      ],
      monitoringPlans: [
        {
          title: 'Basic',
          price: '29 € / mesiac',
          subtitle: '2 domény / 1× týždenne (pondelok)',
          features: ['Monitoring pre 2 domény', 'Automatický beh každý pondelok', 'Priebežné porovnanie výsledkov'],
          ctaLabel: 'Objednať Monitoring Basic',
          ctaClass: 'btn btn-primary',
          badge: 'Monitoring Basic',
          featured: true
        },
        {
          title: 'Monitoring Pro',
          price: '59 € / mesiac',
          subtitle: '8 domén / 2× týždenne (pondelok + štvrtok)',
          features: ['Monitoring pre 8 domén', 'Automatický beh pondelok + štvrtok', 'Rozšírené kontinuálne sledovanie'],
          ctaLabel: 'Objednať Monitoring Pro',
          ctaClass: 'btn btn-outline-dark',
          featured: false
        },
        {
          title: 'Monitoring Enterprise',
          price: 'Na dohodu',
          subtitle: 'Vlastné limity a SLA',
          features: ['Individuálny počet domén', 'Frekvencia podľa potreby', 'Onboarding a konzultácie'],
          ctaLabel: 'Dohodnúť riešenie',
          ctaClass: 'btn btn-outline-dark',
          featured: false
        }
      ],
      compareAudit: {
        columns: ['Audit', 'Free', 'Basic', 'Pro', 'Hĺbkový', 'Enterprise'],
        rows: [
          ['Cena', '0 €', '99 €', '199 €', 'od 499 €', 'Na dohodu'],
          ['Počet domén', '1', '5', '15', 'Podľa dohody', 'Podľa dohody'],
          ['Plný report + odporúčania', '—', '✓', '✓', '✓', '✓'],
          ['Manuálny audit + konzultácia', '—', '—', '—', '✓', '—'],
          ['Podpora / SLA', '—', '—', '—', '—', '✓']
        ]
      },
      compareMonitoring: {
        columns: ['Monitoring', 'Basic', 'Pro', 'Enterprise'],
        rows: [
          ['Cena', '29 € / mesiac', '59 € / mesiac', 'Na dohodu'],
          ['Počet domén', '2', '8', 'Podľa dohody'],
          ['Frekvencia', 'Pondelok', 'Pondelok + štvrtok', 'Podľa dohody'],
          ['Priebežné porovnanie výsledkov', '✓', '✓', '✓']
        ]
      },
      compareAuditMobile: [
        { name: 'Free audit', price: '0 €', items: ['1 doména', 'Rýchly prehľad nálezov'] },
        {
          name: 'Audit Basic',
          price: '99 €',
          items: ['5 domén / 5 kreditov', 'Plný report + odporúčania']
        },
        {
          name: 'Audit Pro',
          price: '199 €',
          items: ['15 domén / 15 kreditov', 'Plný report + odporúčania'],
          featured: true
        },
        {
          name: 'Hĺbkový audit',
          price: 'od 499 €',
          items: ['Manuálny + expertný audit', 'Konzultácia s expertom']
        },
        {
          name: 'Audit Enterprise',
          price: 'Na dohodu',
          items: ['Individuálny rozsah', 'Dedikovaná podpora a SLA']
        }
      ],
      compareMonitoringMobile: [
        { name: 'Monitoring Basic', price: '29 € / mesiac', items: ['2 domény', 'Pondelok'] },
        {
          name: 'Monitoring Pro',
          price: '59 € / mesiac',
          items: ['8 domény', 'Pondelok + štvrtok'],
          featured: true
        },
        {
          name: 'Monitoring Enterprise',
          price: 'Na dohodu',
          items: ['Vlastné limity', 'Frekvencia podľa dohody']
        }
      ]
    },
    compliance: {
      kicker: 'Pre koho je Pristupio',
      title: 'Pre verejné inštitúcie aj komerčné služby.',
      lead:
        'Systém je navrhnutý pre tímy, ktoré potrebujú preukázateľnú zhodu a zrozumiteľný audit od verejnej správy až po e-shopy a digitálne služby.',
      sectors: [
        'Verejný sektor',
        'Banky a poisťovne',
        'E-shopy a retail',
        'Doprava a mobilita',
        'Vzdelávanie',
        'Digitálne služby'
      ]
    },
    faq: {
      kicker: 'FAQ',
      title: 'Najčastejšie otázky o audite a monitoringu.',
      lead: 'Rýchle odpovede na to, čo riešia tímy pred nákupom a počas prvého auditu.',
      items: [
        {
          question: 'Čo je prístupnosť webu a prečo na nej záleží?',
          answer:
            'Prístupnosť znamená, že web sa dá používať aj s asistenčnými technológiami (napr. čítačky obrazovky) a bez myši, len klávesnicou. V praxi to rieši kontrasty, čitateľnosť, jasnú hierarchiu nadpisov, formuláre aj navigáciu. Výsledkom je web, ktorý funguje pre ľudí so znevýhodnením, seniorov aj používateľov v horších podmienkach (mobil, slabé svetlo, dočasné obmedzenie).'
        },
        {
          question: 'Čo dostanem vo free audite?',
          answer:
            'Skóre prístupnosti, počet nálezov a stručný prehľad top problémov. Je to rýchly screening, ktorý vám dá jasnú predstavu o rozsahu, riziku a pomôže určiť priority pred detailným auditom. Hodí sa na prvú diagnostiku a internú diskusiu v tíme.'
        },
        {
          question: 'Aký je rozdiel medzi základným auditom a monitoringom?',
          answer:
            'Základný audit je jednorazový detailný report s odporúčaniami. Monitoring opakuje sken podľa zvoleného plánu (Basic pondelok, Pro pondelok + štvrtok), sleduje zmeny, porovnáva trend a upozorňuje na nové chyby po úpravách webu alebo nasadení nových funkcií. Vďaka tomu máte prehľad, či sa dostupnosť zlepšuje alebo zhoršuje, a nemusíte robiť audit od nuly po každej zmene.'
        },
        {
          question: 'Aký zákon to vyžaduje na Slovensku?',
          answer:
            'Pre verejný sektor platí smernica (EÚ) 2016/2102 a jej transpozícia v SR cez zákon č. 95/2019 Z. z. o IT vo verejnej správe. Pre komerčné služby a produkty platí zákon č. 351/2022 Z. z. o prístupnosti výrobkov a služieb, ktorý vychádza z EAA 2019/882. Výnimky a presný rozsah povinností závisia od typu služby a subjektu.'
        },
        {
          question: 'Dokedy musia byť weby prístupné?',
          answer:
            'Verejný sektor: nové weby od 23. 9. 2019, všetky ostatné weby od 23. 9. 2020 a mobilné aplikácie od 23. 6. 2021. EAA požiadavky sa v EÚ uplatňujú od 28. 6. 2025 a zákon 351/2022 Z. z. je účinný od 28. 6. 2025.'
        },
        {
          question: 'Čo potrebujem na spustenie auditu?',
          answer: 'Stačí URL a výber profilu (WAD alebo EAA). Sken je automatický a nevyžaduje integráciu do kódu.'
        },
        {
          question: 'Pomôže mi audit aj pre vývoj?',
          answer: 'Áno. Každý nález obsahuje prioritu, popis problému a akčné odporúčanie, takže vývoj vie rýchlo určiť ďalší krok.'
        }
      ],
      legalLinksQuestion: 'Kde nájdem znenie smerníc a zákonov?',
      legalLinks: [
        {
          label: 'SR zákon 351/2022 Z. z.',
          href: 'https://www.slov-lex.sk/static/pdf/2022/351/ZZ_2022_351_20250628.pdf',
          source: 'Slov-Lex'
        },
        {
          label: 'SR zákon 95/2019 Z. z.',
          href: 'https://static.slov-lex.sk/pdf/SK/ZZ/2019/95/ZZ_2019_95_20250628.pdf',
          source: 'Slov-Lex'
        },
        {
          label: 'Smernica (EÚ) 2016/2102',
          href: 'https://eur-lex.europa.eu/EN/legal-content/summary/accessibility-of-public-sector-websites-and-mobile-apps.html',
          source: 'EUR-Lex'
        },
        {
          label: 'EAA 2019/882',
          href: 'https://eur-lex.europa.eu/eli/dir/2019/882/oj',
          source: 'EUR-Lex'
        }
      ]
    },
    cta: {
      title: 'Pripravení na audit prístupnosti?',
      lead: 'Začnite free auditom a vyberte si balík, ktorý zodpovedá vašej potrebe.',
      button: 'Spustiť free audit'
    }
  },
  en: {
    hero: {
      eyebrow: 'Accessibility without chaos',
      title: 'A WCAG audit that gives your team a clear plan and confidence during review.',
      lead:
        'Pristupio runs automated checks based on WCAG 2.1 AA and EN 301 549. You get prioritized issues, actionable recommendations, and a report ready for EAA and WAD requirements.',
      primaryCta: 'Get free audit',
      secondaryCta: 'View pricing',
      note: 'The free audit shows score, totals, and top 3 findings. Full reports are available in paid plans.',
      meta: ['WCAG 2.1 AA', 'EN 301 549', 'EAA 2019/882', 'WAD 2016/2102'],
      proof: [
        {
          title: 'Audit with clear output',
          text: 'Prioritized issues and recommendations ready for implementation.'
        },
        {
          title: 'Priority by impact',
          text: 'Fix the barriers that block users first.'
        },
        {
          title: 'Report for the whole team',
          text: 'Output understandable for compliance, product, and engineering.'
        }
      ],
      mockup: {
        title: 'Audit report',
        pill: 'WCAG 2.1 AA',
        scoreLabel: 'Accessibility',
        scoreSubLabel: 'Readiness index',
        bars: [
          { label: 'Critical', count: '12 issues' },
          { label: 'Moderate', count: '18 issues' },
          { label: 'Minor', count: '9 issues' }
        ],
        findings: [
          { title: 'Insufficient text contrast', wcag: 'WCAG 1.4.3' },
          { title: 'Missing aria-labels', wcag: 'WCAG 4.1.2' },
          { title: 'Incorrect heading hierarchy', wcag: 'WCAG 1.3.1' }
        ]
      },
      floatingCard: {
        title: 'Legislation readiness',
        items: ['WAD 2016/2102', 'EAA 2019/882', 'EN 301 549']
      }
    },
    benefits: {
      kicker: 'Why it matters',
      title: 'Accessibility protects people, reduces risk, and strengthens your brand.',
      lead:
        'An inaccessible interface means lost users, legal risk, and brand damage. Pristupio gives you control, clear priorities, and communication the whole team understands.',
      cards: [
        {
          title: 'What you gain',
          items: [
            'A clear remediation plan based on user impact.',
            'A report understandable to both compliance and engineering.',
            'A fast overview of your accessibility status.'
          ]
        },
        {
          title: 'What it protects you from',
          items: [
            'Risk of penalties during EAA and WAD checks.',
            'Negative public reaction and brand damage.',
            'Extra costs caused by chaotic remediation.'
          ]
        },
        {
          title: 'Who it helps',
          items: [
            'Users with visual, hearing, and motor impairments.',
            'Product teams that need clear priorities.',
            'Compliance and legal departments.'
          ]
        }
      ]
    },
    value: {
      kicker: 'What you get',
      title: 'Clear outputs for compliance and product teams.',
      lead: 'Get a clear picture of accessibility status and a remediation plan understandable across the team.',
      cards: [
        {
          title: 'Critical issues first',
          text: 'Issues are automatically prioritized by user impact and organizational risk.',
          iconPaths: ['M4 12h16', 'M4 7h10', 'M4 17h7', 'M17 9l2 2 4-4']
        },
        {
          title: 'Legal context',
          text: 'Each finding is mapped to WCAG criteria and relevant EAA/WAD framework.',
          iconPaths: ['M12 3l8 4v6c0 4-3 7-8 8-5-1-8-4-8-8V7l8-4z', 'M9 12l2 2 4-4']
        },
        {
          title: 'Actionable recommendations',
          text: 'Practical next steps for engineering and content teams, not generic advice.',
          iconPaths: ['M4 4h16v12H7l-3 3V4z', 'M7 8h10', 'M7 12h6']
        }
      ]
    },
    workflow: {
      kicker: 'How it works',
      title: 'Three steps to audits that stand up to review.',
      steps: [
        {
          number: '01',
          title: 'Enter URL and select profile',
          text: 'WAD for public sector or EAA for commercial services and products.'
        },
        {
          number: '02',
          title: 'Run the audit',
          text: 'Automated scan evaluates issues and calculates score.'
        },
        {
          number: '03',
          title: 'Share the report',
          text: 'A clear remediation plan for the entire team.'
        }
      ]
    },
    pricing: {
      kicker: 'Pricing',
      title: 'Audit and monitoring plans by scope.',
      lead: 'Free audit is one-time for 1 domain. Paid plans run on credits/domains based on selected plan.',
      ariaLabel: 'Pricing type',
      switchAudit: 'Audit',
      switchMonitoring: 'Monitoring',
      subheadAudit: 'Audit',
      subheadMonitoring: 'Monitoring (after initial audit)',
      summary:
        'Audit credits are deducted for each new domain audit. Monitoring plans are available after a base audit and limits/frequency depend on the selected tier.',
      auditPlans: [
        {
          title: 'Free audit',
          price: '€0',
          subtitle: '1 audit / 1 domain',
          features: ['Accessibility score', 'Top findings for a quick overview', 'One-time for 1 domain'],
          ctaLabel: 'Start free audit',
          ctaClass: 'btn btn-outline-dark'
        },
        {
          title: 'Audit Basic',
          price: '€99',
          subtitle: '5 credits / 5 domains',
          features: ['Full report + recommendations', '5 audit credits', 'For 5 domains'],
          ctaLabel: 'Order Basic',
          ctaClass: 'btn btn-outline-dark',
          badge: 'Most popular',
          featured: true
        },
        {
          title: 'Audit Pro',
          price: '€199',
          subtitle: '15 credits / 15 domains',
          features: ['Full report + recommendations', '15 audit credits', 'For 15 domains'],
          ctaLabel: 'Order Pro',
          ctaClass: 'btn btn-primary',
          badge: 'Best value',
          featured: true
        },
        {
          title: 'Deep audit',
          price: 'from €499',
          subtitle: 'Manual + expert audit',
          features: ['Detailed manual audit', 'Obligations checklist', 'Expert consultation'],
          ctaLabel: 'Request solution',
          ctaClass: 'btn btn-outline-dark'
        },
        {
          title: 'Audit Enterprise',
          price: 'Custom',
          subtitle: 'Tailored solution',
          features: ['Custom domain scope', 'SLA and dedicated support', 'Process aligned with internal requirements'],
          ctaLabel: 'Request solution',
          ctaClass: 'btn btn-outline-dark'
        }
      ],
      monitoringPlans: [
        {
          title: 'Basic',
          price: '€29 / month',
          subtitle: '2 domains / 1x weekly (Monday)',
          features: ['Monitoring for 2 domains', 'Automatic run every Monday', 'Continuous result comparison'],
          ctaLabel: 'Order Monitoring Basic',
          ctaClass: 'btn btn-primary',
          badge: 'Monitoring Basic',
          featured: true
        },
        {
          title: 'Monitoring Pro',
          price: '€59 / month',
          subtitle: '8 domains / 2x weekly (Monday + Thursday)',
          features: ['Monitoring for 8 domains', 'Automatic run Monday + Thursday', 'Extended continuous tracking'],
          ctaLabel: 'Order Monitoring Pro',
          ctaClass: 'btn btn-outline-dark'
        },
        {
          title: 'Monitoring Enterprise',
          price: 'Custom',
          subtitle: 'Custom limits and SLA',
          features: ['Custom number of domains', 'Frequency as needed', 'Onboarding and consulting'],
          ctaLabel: 'Request solution',
          ctaClass: 'btn btn-outline-dark'
        }
      ],
      compareAudit: {
        columns: ['Audit', 'Free', 'Basic', 'Pro', 'Deep', 'Enterprise'],
        rows: [
          ['Price', '€0', '€99', '€199', 'from €499', 'Custom'],
          ['Domains', '1', '5', '15', 'As agreed', 'As agreed'],
          ['Full report + recommendations', '—', '✓', '✓', '✓', '✓'],
          ['Manual audit + consultation', '—', '—', '—', '✓', '—'],
          ['Support / SLA', '—', '—', '—', '—', '✓']
        ]
      },
      compareMonitoring: {
        columns: ['Monitoring', 'Basic', 'Pro', 'Enterprise'],
        rows: [
          ['Price', '€29 / month', '€59 / month', 'Custom'],
          ['Domains', '2', '8', 'As agreed'],
          ['Frequency', 'Monday', 'Monday + Thursday', 'As agreed'],
          ['Continuous comparison', '✓', '✓', '✓']
        ]
      },
      compareAuditMobile: [
        { name: 'Free audit', price: '€0', items: ['1 domain', 'Quick findings overview'] },
        { name: 'Audit Basic', price: '€99', items: ['5 domains / 5 credits', 'Full report + recommendations'] },
        { name: 'Audit Pro', price: '€199', items: ['15 domains / 15 credits', 'Full report + recommendations'], featured: true },
        { name: 'Deep audit', price: 'from €499', items: ['Manual + expert audit', 'Expert consultation'] },
        { name: 'Audit Enterprise', price: 'Custom', items: ['Custom scope', 'Dedicated support and SLA'] }
      ],
      compareMonitoringMobile: [
        { name: 'Monitoring Basic', price: '€29 / month', items: ['2 domains', 'Monday'] },
        { name: 'Monitoring Pro', price: '€59 / month', items: ['8 domains', 'Monday + Thursday'], featured: true },
        { name: 'Monitoring Enterprise', price: 'Custom', items: ['Custom limits', 'Frequency by agreement'] }
      ]
    },
    compliance: {
      kicker: 'Who Pristupio is for',
      title: 'For public institutions and commercial services.',
      lead:
        'The system is designed for teams that need demonstrable compliance and an understandable audit output from public administration to ecommerce and digital services.',
      sectors: ['Public sector', 'Banks and insurance', 'Ecommerce and retail', 'Transport and mobility', 'Education', 'Digital services']
    },
    faq: {
      kicker: 'FAQ',
      title: 'Most common questions about audit and monitoring.',
      lead: 'Quick answers to what teams ask before purchase and during their first audit.',
      items: [
        {
          question: 'What is web accessibility and why does it matter?',
          answer:
            'Accessibility means a website can be used with assistive technologies (for example screen readers) and without a mouse, only with keyboard navigation. In practice this includes contrast, readability, heading structure, forms, and navigation. The result is a site that works for people with disabilities, seniors, and users in challenging conditions.'
        },
        {
          question: 'What do I get in the free audit?',
          answer:
            'You get an accessibility score, number of findings, and a short top findings overview. It is a quick screening that helps estimate scope and risk and set priorities before a detailed audit.'
        },
        {
          question: 'What is the difference between a base audit and monitoring?',
          answer:
            'A base audit is a one-time detailed report with recommendations. Monitoring repeats scanning on a selected schedule (Basic Monday, Pro Monday + Thursday), tracks changes, compares trends, and highlights new issues after updates.'
        },
        {
          question: 'Which law requires this in Slovakia?',
          answer:
            'For public sector, EU Directive 2016/2102 applies (transposed in Slovakia via Act No. 95/2019). For commercial services and products, Act No. 351/2022 applies based on EAA 2019/882. Scope and exceptions depend on service type and legal entity.'
        },
        {
          question: 'By when must websites be accessible?',
          answer:
            'Public sector deadlines were September 23, 2019 for new websites, September 23, 2020 for all websites, and June 23, 2021 for mobile apps. EAA requirements in the EU apply from June 28, 2025.'
        },
        {
          question: 'What do I need to start an audit?',
          answer: 'Only a URL and profile selection (WAD or EAA). The scan is automated and requires no code integration.'
        },
        {
          question: 'Does the audit help developers too?',
          answer: 'Yes. Each finding includes priority, issue description, and actionable recommendation so engineering can decide the next step quickly.'
        }
      ],
      legalLinksQuestion: 'Where can I find legal texts and directives?',
      legalLinks: [
        {
          label: 'SK Act 351/2022',
          href: 'https://www.slov-lex.sk/static/pdf/2022/351/ZZ_2022_351_20250628.pdf',
          source: 'Slov-Lex'
        },
        {
          label: 'SK Act 95/2019',
          href: 'https://static.slov-lex.sk/pdf/SK/ZZ/2019/95/ZZ_2019_95_20250628.pdf',
          source: 'Slov-Lex'
        },
        {
          label: 'Directive (EU) 2016/2102',
          href: 'https://eur-lex.europa.eu/EN/legal-content/summary/accessibility-of-public-sector-websites-and-mobile-apps.html',
          source: 'EUR-Lex'
        },
        {
          label: 'EAA 2019/882',
          href: 'https://eur-lex.europa.eu/eli/dir/2019/882/oj',
          source: 'EUR-Lex'
        }
      ]
    },
    cta: {
      title: 'Ready for an accessibility audit?',
      lead: 'Start with a free audit and choose the package that fits your needs.',
      button: 'Start free audit'
    }
  }
} as const
