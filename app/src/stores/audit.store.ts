import { defineStore } from 'pinia'
import { useAuthStore } from './auth.store'

export const useAuditStore = defineStore('audit', {
  state: () => ({
    loading: false,
    currentAudit: null as any,
    report: null as null | {
      summary: {
        total: number
        byImpact: Record<'critical' | 'serious' | 'moderate' | 'minor', number>
      }
      issues: Array<{
        id: string
        title: string
        impact: 'critical' | 'serious' | 'moderate' | 'minor'
        description: string
        recommendation: string
        wcag: string
        wcagLevel: string
        principle: string
        helpUrl?: string
        nodesCount: number
        nodes: Array<{
          target: string[]
          html: string
          failureSummary?: string
        }>
      }>
    },
    error: null as string | null
  }),

  actions: {
    async runManualAudit(url: string) {
      this.loading = true
      this.error = null
      const auth = useAuthStore()

      try {
        const response = await fetch('/.netlify/functions/audit-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            userId: auth.userId
          })
        })

        if (!response.ok) throw new Error('Audit zlyhal')

        const data = await response.json()
        const results = data?.results ?? data
        this.currentAudit = results
        this.report = normalizeAuditResults(results)
      } catch (err: any) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    }
  }
})

function normalizeAuditResults(results: any) {
  const violations = Array.isArray(results?.violations) ? results.violations : []
  const summary = {
    total: violations.length,
    byImpact: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    }
  }

  const issues = violations.map((v: any) => {
    const impact = (v.impact as 'critical' | 'serious' | 'moderate' | 'minor') || 'minor'
    if (summary.byImpact[impact] !== undefined) summary.byImpact[impact] += 1

    const nodes = Array.isArray(v.nodes)
      ? v.nodes.map((n: any) => ({
          target: Array.isArray(n.target) ? n.target : [],
          html: n.html || '',
          failureSummary: n.failureSummary
        }))
      : []

    const guidance = getGuidance(v.id, v.description, v.help)
    return {
      id: v.id || v.help || 'unknown',
      title: guidance.title,
      impact,
      description: guidance.description,
      recommendation: guidance.recommendation,
      wcag: guidance.wcag,
      wcagLevel: getWcagLevel(v.id, guidance.wcag),
      principle: guidance.principle,
      helpUrl: v.helpUrl,
      nodesCount: nodes.length,
      nodes
    }
  })

  return { summary, issues }
}

function getGuidance(id?: string, description?: string, help?: string) {
  switch (id) {
    case 'color-contrast':
      return {
        title: 'Nizky kontrast textu a pozadia',
        description: 'Text a pozadie nemaju dostatocny kontrast pre WCAG 2.1 AA.',
        recommendation: 'Upravte farby textu alebo pozadia tak, aby kontrast dosiahol aspon 4.5:1 (pre bezny text). Pomaha stmavit pozadie alebo zosvetlit text.',
        wcag: '1.4.3 Kontrast (minimalny)',
        principle: 'Vnimatelnost'
      }
    case 'heading-order':
      return {
        title: 'Nadpisy nenasleduju logicku hierarchiu',
        description: 'Nadpisy preskakuju urovne, co stazuje orientaciu.',
        recommendation: 'Zoradte nadpisy hierarchicky bez preskakovania urovni (napr. h2 -> h3, nie h2 -> h4).',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'page-has-main':
      return {
        title: 'Stranka nema hlavny obsah (landmark)',
        description: 'Chyba hlavny landmark, ktory pomaha asistivnym technologiam.',
        recommendation: 'Pridajte hlavny landmark, idealne obalte hlavny obsah do <main>...</main>.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'region':
      return {
        title: 'Obsah nie je v landmarkoch',
        description: 'Cast obsahu nie je v semantickych oblastiach stranky.',
        recommendation: 'Umiestnite obsah do landmarkov (<main>, <header>, <nav>, <section>, <footer>) alebo pridajte vhodne aria-label na sekcie.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'image-alt':
      return {
        title: 'Obrazok nema alternativny text',
        description: 'Obrazky bez alt textu su necitatelne pre citacky obrazovky.',
        recommendation: 'Doplnte zmysluplny alt text ku kazdemu obrazku, ktory nesie informaciu.',
        wcag: '1.1.1 Ne-textovy obsah',
        principle: 'Vnimatelnost'
      }
    case 'label':
      return {
        title: 'Formularove pole nema label',
        description: 'Pole nie je jednoznacne popisane pre pouzivatelov a citacky.',
        recommendation: 'Pridajte priradeny label ku kazdemu formularovemu polu (atribut for + id).',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'link-name':
      return {
        title: 'Odkaz nema zrozumitelny nazov',
        description: 'Pouzivatel nevie, kam odkaz smeruje.',
        recommendation: 'Kazdy odkaz musi mat zrozumitelny text alebo aria-label.',
        wcag: '2.4.4 Ucel odkazu (v kontexte)',
        principle: 'Ovladatelnost'
      }
    case 'button-name':
      return {
        title: 'Tlacidlo nema zrozumitelny nazov',
        description: 'Tlacidlo nema text/label, ktory by vysvetloval jeho funkciu.',
        recommendation: 'Kazde tlacidlo musi mat zrozumitelny text alebo aria-label.',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'duplicate-id':
      return {
        title: 'Duplicitne id v HTML',
        description: 'Rovnake id je pouzite viackrat, co mata asistivne technologie.',
        recommendation: 'Zabezpecte, aby kazde id na stranke bolo jedinecne (duplicitne id sposobuje problemy citackam).',
        wcag: '4.1.1 Spravne parsovanie',
        principle: 'Robustnost'
      }
    case 'html-has-lang':
      return {
        title: 'Chyba jazyk stranky',
        description: 'Dokument nema nastaveny jazyk.',
        recommendation: 'Pridajte atribut lang na <html> (napr. <html lang="sk">).',
        wcag: '3.1.1 Jazyk stranky',
        principle: 'Zrozumitelnost'
      }
    case 'html-lang-valid':
      return {
        title: 'Neplatna hodnota jazyka',
        description: 'Atribut lang nema platny jazykovy kod.',
        recommendation: 'Skontrolujte, ze hodnota lang je platny jazykovy kod (napr. sk, en).',
        wcag: '3.1.1 Jazyk stranky',
        principle: 'Zrozumitelnost'
      }
    case 'document-title':
      return {
        title: 'Chyba nazov stranky',
        description: 'Stranka nema zmysluplny <title>.',
        recommendation: 'Doplnte zmysluplny <title> v <head>, aby pouzivatel vedel, na akej stranke je.',
        wcag: '2.4.2 Nazov stranky',
        principle: 'Ovladatelnost'
      }
    case 'meta-viewport':
      return {
        title: 'Chyba meta viewport',
        description: 'Stranka nie je optimalizovana pre mobilne zariadenia.',
        recommendation: 'Pridajte <meta name="viewport" content="width=device-width, initial-scale=1"> pre spravne zobrazenie na mobiloch.',
        wcag: '1.4.10 Reflow',
        principle: 'Vnimatelnost'
      }
    case 'aria-allowed-attr':
      return {
        title: 'Nepovolene ARIA atributy',
        description: 'Element ma ARIA atributy, ktore pre neho nie su povolene.',
        recommendation: 'Odstrante alebo opravte aria-* atributy, ktore nie su povolene pre dany element.',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'aria-required-attr':
      return {
        title: 'Chybaju povinne ARIA atributy',
        description: 'Rola vyzaduje ARIA atributy, ktore nie su uvedene.',
        recommendation: 'Pridajte chybajuce aria-* atributy, ktore su pre danu rolu povinne.',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'aria-valid-attr':
      return {
        title: 'Neplatne ARIA atributy',
        description: 'Pouzite ARIA atributy nie su platne.',
        recommendation: 'Pouzite len platne aria-* atributy (neexistujuce alebo preklepy su problem).',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'aria-valid-attr-value':
      return {
        title: 'Neplatna hodnota ARIA atributu',
        description: 'Hodnota ARIA atributu nie je v povolenom formate.',
        recommendation: 'Skontrolujte, ze aria-* hodnoty maju spravny format a povolene hodnoty.',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'aria-roles':
      return {
        title: 'Neplatna ARIA rola',
        description: 'Pouzita rola nie je validna.',
        recommendation: 'Pouzite len validne ARIA roly (neexistujuce alebo nespravne pomenovane roly treba opravit).',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'aria-allowed-role':
      return {
        title: 'Nepovolena ARIA rola na elemente',
        description: 'Na danom elemente nie je povolena pouzita rola.',
        recommendation: 'Na danom elemente pouzite iba povolene ARIA roly.',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'aria-required-children':
      return {
        title: 'ARIA rola potrebuje spravne vnorenie',
        description: 'Niektore ARIA roly musia obsahovat konkretne podprvky.',
        recommendation: 'Ak pouzivate ARIA rolu, doplnte pozadovane vnorene prvky (napr. role="list" ma mat role="listitem").',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'aria-required-parent':
      return {
        title: 'ARIA rola musi byt v spravnom rodicovi',
        description: 'Niektore roly musia byt vnorene v konkretnych rodicovskych rolach.',
        recommendation: 'Element s danou rolou musi byt v povolenom rodicovi (napr. role="listitem" v role="list").',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'aria-hidden-body':
      return {
        title: 'Obsah je skryty pre citacky',
        description: 'Atribut aria-hidden skryva hlavny obsah.',
        recommendation: 'Nepridavajte aria-hidden="true" na <body> alebo klucove kontajnery obsahu.',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'aria-unsupported-elements':
      return {
        title: 'ARIA na nepodporovanom elemente',
        description: 'Element nepodporuje pouzite ARIA atributy.',
        recommendation: 'Odstrante ARIA atributy z elementov, ktore ich nepodporuju.',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'input-button-name':
      return {
        title: 'Input tlacidlo nema nazov',
        description: 'Input typu button/submit nema zrozumitelny text.',
        recommendation: 'Kazdy input typu button/submit musi mat zrozumitelny text (value) alebo aria-label.',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'label-title-only':
      return {
        title: 'Label je iba v title',
        description: 'Title samotny nie je dostatocny popis pola.',
        recommendation: 'Nepouzivajte iba title ako label. Pridajte viditelny label alebo aria-label.',
        wcag: '3.3.2 Stitky alebo instrukcie',
        principle: 'Zrozumitelnost'
      }
    case 'form-field-multiple-labels':
      return {
        title: 'Pole ma viac labelov',
        description: 'Formularove pole ma viacero labelov, co mata pouzivatelov.',
        recommendation: 'Uistite sa, ze kazdy input ma len jeden jednoznacny label.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'form-field-multiple-labels-implicit':
      return {
        title: 'Pole ma viac implicitnych labelov',
        description: 'Pole je obalene viacerymi label elementmi.',
        recommendation: 'Uistite sa, ze element nema viac implicitnych labelov.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'duplicate-id-aria':
      return {
        title: 'Duplicitne id v ARIA odkazoch',
        description: 'ARIA atributy odkazuju na duplicitne id.',
        recommendation: 'Odstrante duplicitne id, na ktore odkazuju ARIA atributy (aria-labelledby, aria-describedby).',
        wcag: '4.1.1 Spravne parsovanie',
        principle: 'Robustnost'
      }
    case 'focus-order-semantics':
      return {
        title: 'Nelogicky poriadok focusu',
        description: 'Poriadok focusu nezodpoveda vizualnemu poradiu.',
        recommendation: 'Upravte DOM/tabindex tak, aby focus postupoval logicky podla vizualneho poradia.',
        wcag: '2.4.3 Poradie fokusu',
        principle: 'Ovladatelnost'
      }
    case 'tabindex':
      return {
        title: 'Nevhodny tabindex',
        description: 'Pozitivny tabindex komplikuje ovladanie klavesnicou.',
        recommendation: 'Nepouzivajte pozitivne tabindex; ponechajte prirodzeny poriadok alebo pouzivajte 0/-1.',
        wcag: '2.4.3 Poradie fokusu',
        principle: 'Ovladatelnost'
      }
    case 'bypass':
      return {
        title: 'Chyba moznost preskocit opakovane bloky',
        description: 'Pouzivatelia klavesnice musia prechadzat dlhe navigacie.',
        recommendation: 'Pridajte "Preskocit na obsah" odkaz alebo iny mechanizmus na preskocenie opakovanych blokov.',
        wcag: '2.4.1 Preskocenie blokov',
        principle: 'Ovladatelnost'
      }
    case 'landmark-one-main':
      return {
        title: 'Viac hlavnych landmarkov',
        description: 'Stranka ma viac ako jeden <main>.',
        recommendation: 'Na stranke ma byt len jeden hlavny landmark (<main>).',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'landmark-unique':
      return {
        title: 'Landmarky nie su jednoznacne',
        description: 'Viac landmarkov rovnakeho typu nema rozlisenie.',
        recommendation: 'Landmarky rovnakeho typu odliste aria-label alebo aria-labelledby.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'list':
      return {
        title: 'Nespravna struktura zoznamu',
        description: 'Zoznam nema spravnu semanticku strukturu.',
        recommendation: 'Pouzite spravnu strukturu zoznamu: <ul>/<ol> obsahuju <li> prvky.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'listitem':
      return {
        title: 'Polozka zoznamu nema spravneho rodica',
        description: 'Polozka zoznamu nie je v <ul>/<ol>.',
        recommendation: 'Zabezpecte, aby polozky zoznamu boli v <li> a v spravnom rodicovi.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'frame-title':
      return {
        title: 'Iframe nema nazov',
        description: 'Iframe bez title je nejasny pre citacky obrazovky.',
        recommendation: 'Kazdy <iframe> musi mat zmysluplny title.',
        wcag: '4.1.2 Nazov, rola, hodnota',
        principle: 'Robustnost'
      }
    case 'image-redundant-alt':
      return {
        title: 'Alt text je redundantny',
        description: 'Alt obsahuje zbytocne slova typu "image" alebo "photo".',
        recommendation: 'Odstrante nadbytocny text typu "image" alebo "photo" z altu; alt ma popisovat obsah.',
        wcag: '1.1.1 Ne-textovy obsah',
        principle: 'Vnimatelnost'
      }
    case 'empty-heading':
      return {
        title: 'Prazdny nadpis',
        description: 'Nadpis bez textu mata strukturu dokumentu.',
        recommendation: 'Odstrante prazdne nadpisy alebo doplnte text.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'empty-table-header':
      return {
        title: 'Prazdna hlavicka tabulky',
        description: 'Tabulkove hlavicky nemaju text.',
        recommendation: 'Zabezpecte, aby hlavicky tabulky mali text (th nesmie byt prazdny).',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'table-duplicate-name':
      return {
        title: 'Nejednoznacne nazvy tabulky',
        description: 'Nazvy alebo hlavicky tabulky nie su jednoznacne.',
        recommendation: 'Zabezpecte, aby nazvy/tabulkove hlavicky boli jedinecne a zrozumitelne.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'td-headers-attr':
      return {
        title: 'Chyba prepojenie buniek v tabulke',
        description: 'Bunky tabulky nemaju spravne prepojenie na hlavicky.',
        recommendation: 'Pridajte spravne prepojenie buniek tabulky cez headers/id alebo pouzite scope.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'th-has-data-cells':
      return {
        title: 'Hlavicka tabulky nepopisuje data',
        description: 'Element <th> nepopisuje datove bunky.',
        recommendation: 'Uistite sa, ze <th> skutocne popisuje datove bunky v tabulke.',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'scope-attr-valid':
      return {
        title: 'Neplatny scope v tabulke',
        description: 'Atribut scope nema platnu hodnotu.',
        recommendation: 'Atribut scope v <th> musi mat platnu hodnotu (col, row, colgroup, rowgroup).',
        wcag: '1.3.1 Informacie a vztahy',
        principle: 'Vnimatelnost'
      }
    case 'video-caption':
      return {
        title: 'Video bez titulkov',
        description: 'Video s hovorenym slovom potrebuje titulky.',
        recommendation: 'Pre video s hovorenym slovom pridajte titulky (captions).',
        wcag: '1.2.2 Titulky (nahrane)',
        principle: 'Vnimatelnost'
      }
    case 'audio-caption':
      return {
        title: 'Audio bez prepisu',
        description: 'Audio obsah potrebuje textovy prepis.',
        recommendation: 'Pre audio obsah poskytnite textovy prepis alebo titulky.',
        wcag: '1.2.1 Iba zvuk a iba video (nahrane)',
        principle: 'Vnimatelnost'
      }
    case 'object-alt':
      return {
        title: 'Objekt bez alternativneho textu',
        description: 'Vlozeny objekt nema textovu alternativu.',
        recommendation: 'Pre <object> alebo <embed> pridajte alternativny text.',
        wcag: '1.1.1 Ne-textovy obsah',
        principle: 'Vnimatelnost'
      }
    case 'autocomplete-valid':
      return {
        title: 'Neplatna hodnota autocomplete',
        description: 'Formularove polia nemaju platny autocomplete.',
        recommendation: 'Pouzite platne hodnoty autocomplete pre formularove polia.',
        wcag: '1.3.5 Identifikacia ucelu vstupu',
        principle: 'Vnimatelnost'
      }
    case 'accesskeys':
      return {
        title: 'Accesskey moze sposobovat konflikty',
        description: 'Accesskey moze kolidovat so skratkami prehliadaca alebo asistivnych technologii.',
        recommendation: 'Vyhnite sa accesskey alebo sa uistite, ze nekoliduje s beznymi skratkami prehliadaca.',
        wcag: '2.1.4 Klavesove skratky',
        principle: 'Ovladatelnost'
      }
    default:
      return {
        title: help || 'Neznamy problem',
        description: description || 'Tento problem nema detailny popis.',
        recommendation: description
          ? 'Skontrolujte tento problem manualne a upravte HTML tak, aby splnalo WCAG (pozri popis vyssie).'
          : 'Skontrolujte tento problem manualne a upravte HTML tak, aby splnalo WCAG.',
        wcag: 'Neurcene',
        principle: 'Neurcene'
      }
  }
}

function getWcagLevel(id?: string, wcag?: string) {
  const levelById: Record<string, string> = {
    'color-contrast': 'AA',
    'meta-viewport': 'AA',
    'autocomplete-valid': 'AA',
    'heading-order': 'A',
    'page-has-main': 'A',
    'region': 'A',
    'image-alt': 'A',
    'label': 'A',
    'link-name': 'A',
    'button-name': 'A',
    'duplicate-id': 'A',
    'html-has-lang': 'A',
    'html-lang-valid': 'A',
    'document-title': 'A',
    'aria-allowed-attr': 'A',
    'aria-required-attr': 'A',
    'aria-valid-attr': 'A',
    'aria-valid-attr-value': 'A',
    'aria-roles': 'A',
    'aria-allowed-role': 'A',
    'aria-required-children': 'A',
    'aria-required-parent': 'A',
    'aria-hidden-body': 'A',
    'aria-unsupported-elements': 'A',
    'input-button-name': 'A',
    'label-title-only': 'A',
    'form-field-multiple-labels': 'A',
    'form-field-multiple-labels-implicit': 'A',
    'duplicate-id-aria': 'A',
    'focus-order-semantics': 'A',
    'tabindex': 'A',
    'bypass': 'A',
    'landmark-one-main': 'A',
    'landmark-unique': 'A',
    'list': 'A',
    'listitem': 'A',
    'frame-title': 'A',
    'image-redundant-alt': 'A',
    'empty-heading': 'A',
    'empty-table-header': 'A',
    'table-duplicate-name': 'A',
    'td-headers-attr': 'A',
    'th-has-data-cells': 'A',
    'scope-attr-valid': 'A',
    'video-caption': 'A',
    'audio-caption': 'A',
    'object-alt': 'A',
    'accesskeys': 'A'
  }

  if (id && levelById[id]) return levelById[id]
  if (wcag && wcag.includes('1.4.3')) return 'AA'
  if (wcag && wcag.includes('1.4.10')) return 'AA'
  return 'Neurcene'
}
