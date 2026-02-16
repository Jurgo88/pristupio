export type GuidanceTemplate = {
  title: string
  description: string
  recommendation: string
  wcag: string
  principle: string
}

const GUIDANCE_BY_ID: Record<string, GuidanceTemplate> = {
  "color-contrast": {
    title: "Nízky kontrast textu a pozadia",
    description: "Text a pozadie nemajú dostatočný kontrast.",
    recommendation: "Upravte farby textu alebo pozadia tak, aby kontrast dosiahol aspoň 4.5:1 (pri bežnom texte).",
    wcag: "1.4.3 Kontrast (minimálny)",
    principle: "Vnímateľnosť"
  },
  "heading-order": {
    title: "Nadpisy nemajú logickú hierarchiu",
    description: "Nadpisy preskakujú úrovne, čo sťažuje orientáciu.",
    recommendation: "Použite hierarchiu nadpisov bez preskakovania úrovní (napr. h2 -> h3).",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "page-has-main": {
    title: "Stránka nemá hlavnú oblasť obsahu",
    description: "Na stránke chýba hlavná oblasť obsahu, ktorá pomáha orientácii používateľov a čítačiek.",
    recommendation: "Obaľte hlavný obsah do elementu <main>.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "region": {
    title: "Obsah nie je v orientačných oblastiach",
    description: "Časť obsahu je mimo orientačných oblastí stránky.",
    recommendation: "Použite orientačné oblasti ako <main>, <header>, <nav>, <footer> alebo doplňte aria-label.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "image-alt": {
    title: "Obrázok nemá alternatívny text",
    description: "Obrázok bez alt textu nie je zrozumiteľný pre čítačky obrazovky.",
    recommendation: "Doplňte zmysluplný alt text ku každému informačnému obrázku.",
    wcag: "1.1.1 Ne-textový obsah",
    principle: "Vnímateľnosť"
  },
  "label": {
    title: "Formulárové pole nemá popis",
    description: "Používateľ nemusí vedieť, čo má do poľa zadať.",
    recommendation: "Pridajte ku každému polu priradený label (for + id).",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "link-name": {
    title: "Odkaz nemá zrozumiteľný názov",
    description: "Z textu odkazu nie je jasný jeho cieľ.",
    recommendation: "Každý odkaz musí mať zrozumiteľný text alebo aria-label.",
    wcag: "2.4.4 Účel odkazu (v kontexte)",
    principle: "Ovládateľnosť"
  },
  "button-name": {
    title: "Tlačidlo nemá zrozumiteľný názov",
    description: "Nie je jasné, čo tlačidlo urobí po stlačení.",
    recommendation: "Každé tlačidlo musí mať text alebo aria-label, ktoré vysvetlia jeho funkciu.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "duplicate-id": {
    title: "Duplicitné id v HTML",
    description: "Rovnaké id je použité viackrát.",
    recommendation: "Každé id na stránke musí byť jedinečné.",
    wcag: "4.1.1 Správne parsovanie",
    principle: "Robustnosť"
  },
  "html-has-lang": {
    title: "Chýba jazyk stránky",
    description: "Prehliadač ani čítačka nevedia určiť jazyk obsahu.",
    recommendation: "Pridajte atribút lang na html element (napr. <html lang=\"sk\">).",
    wcag: "3.1.1 Jazyk stránky",
    principle: "Zrozumiteľnosť"
  },
  "html-lang-valid": {
    title: "Neplatná hodnota jazyka",
    description: "Atribút lang má neplatný alebo neúplný kód jazyka.",
    recommendation: "Použite platný jazykový kód (napr. sk, en).",
    wcag: "3.1.1 Jazyk stránky",
    principle: "Zrozumiteľnosť"
  },
  "document-title": {
    title: "Chýba názov stránky",
    description: "Stránka nemá zmysluplný názov (<title>).",
    recommendation: "Doplňte zmysluplný názov stránky pomocou elementu <title> v <head>.",
    wcag: "2.4.2 Názov stránky",
    principle: "Ovládateľnosť"
  },
  "meta-viewport": {
    title: "Chýba meta viewport",
    description: "Stránka nemusí byť správne zobrazená na mobilných zariadeniach.",
    recommendation: "Pridajte <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.",
    wcag: "1.4.10 Reflow",
    principle: "Vnímateľnosť"
  },
  "aria-allowed-attr": {
    title: "Nepovolené ARIA atribúty",
    description: "Element obsahuje ARIA atribúty, ktoré preň nie sú povolené.",
    recommendation: "Odstráňte alebo opravte aria-* atribúty podľa použitej roly elementu.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "aria-required-attr": {
    title: "Chýbajú povinné ARIA atribúty",
    description: "Použitá rola vyžaduje atribúty, ktoré nie sú uvedené.",
    recommendation: "Doplňte povinné aria-* atribúty pre danú rolu.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "aria-valid-attr": {
    title: "Neplatné ARIA atribúty",
    description: "Atribút aria-* je neplatný alebo nesprávne napísaný.",
    recommendation: "Používajte iba platné ARIA atribúty.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "aria-valid-attr-value": {
    title: "Neplatná hodnota ARIA atribútu",
    description: "Hodnota aria-* atribútu nie je v povolenom formáte.",
    recommendation: "Skontrolujte a opravte hodnoty ARIA atribútov.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "aria-roles": {
    title: "Neplatná ARIA rola",
    description: "Element má neexistujúcu alebo nesprávnu rolu.",
    recommendation: "Použite iba platné ARIA roly.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "aria-allowed-role": {
    title: "Nepovolená ARIA rola na elemente",
    description: "Pre daný element nie je táto rola povolená.",
    recommendation: "Použite rolu, ktorá je pre element povolená.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "aria-required-children": {
    title: "ARIA rola potrebuje správne vnorenie",
    description: "Použitá rola vyžaduje konkrétne podradené elementy.",
    recommendation: "Doplňte povinné vnorené elementy pre danú rolu.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "aria-required-parent": {
    title: "ARIA rola potrebuje správneho rodiča",
    description: "Rola môže byť použitá iba v určitom nadradenom elemente.",
    recommendation: "Umiestnite element do povoleného rodiča pre danú rolu.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "aria-hidden-body": {
    title: "Obsah je skrytý pre čítačky",
    description: "Atribút aria-hidden skrýva dôležitý obsah.",
    recommendation: "Neaplikujte aria-hidden=\"true\" na body ani na hlavný obsah.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "aria-unsupported-elements": {
    title: "ARIA na nepodporovanom elemente",
    description: "Element nepodporuje použité ARIA atribúty.",
    recommendation: "Odstráňte ARIA atribúty z nepodporovaných elementov.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "input-button-name": {
    title: "Vstupné tlačidlo nemá názov",
    description: "Pole typu button alebo submit nemá zrozumiteľný text.",
    recommendation: "Doplňte text do value alebo použite aria-label.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "label-title-only": {
    title: "Popis poľa je iba v atribúte title",
    description: "Atribút title samotný nestačí ako popis poľa.",
    recommendation: "Použite viditeľný label alebo aria-label.",
    wcag: "3.3.2 Štítky alebo inštrukcie",
    principle: "Zrozumiteľnosť"
  },
  "form-field-multiple-labels": {
    title: "Pole má viac popisov",
    description: "Jedno pole je prepojené s viacerými labelmi.",
    recommendation: "Nechajte pre každé pole iba jeden jednoznačný label.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "form-field-multiple-labels-implicit": {
    title: "Pole má viac implicitných popisov",
    description: "Pole je obalené viacerými label elementmi.",
    recommendation: "Skontrolujte HTML a ponechajte iba jeden implicitný label.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "duplicate-id-aria": {
    title: "Duplicitné id v ARIA odkazoch",
    description: "ARIA atribúty odkazujú na nejedinečné id.",
    recommendation: "Zabezpečte jedinečné id pre aria-labelledby a aria-describedby.",
    wcag: "4.1.1 Správne parsovanie",
    principle: "Robustnosť"
  },
  "focus-order-semantics": {
    title: "Nelogické poradie fokusu",
    description: "Fokus sa pri navigácii klávesnicou pohybuje nelogicky.",
    recommendation: "Upravte poradie prvkov alebo tabindex, aby fokus išiel prirodzene.",
    wcag: "2.4.3 Poradie fokusu",
    principle: "Ovládateľnosť"
  },
  "tabindex": {
    title: "Nevhodný tabindex",
    description: "Pozitívny tabindex zvyčajne zhoršuje ovládanie klávesnicou.",
    recommendation: "Používajte prirodzené poradie prvkov alebo tabindex 0/-1.",
    wcag: "2.4.3 Poradie fokusu",
    principle: "Ovládateľnosť"
  },
  "bypass": {
    title: "Chýba možnosť preskočiť opakované bloky",
    description: "Používatelia klávesnice musia opakovane prechádzať navigáciu.",
    recommendation: "Pridajte odkaz Preskočiť na obsah alebo podobný mechanizmus.",
    wcag: "2.4.1 Preskočenie blokov",
    principle: "Ovládateľnosť"
  },
  "accesskeys": {
    title: "Klávesová skratka accesskey môže spôsobovať konflikty",
    description: "Atribút accesskey môže kolidovať so skratkami prehliadača a asistenčných nástrojov.",
    recommendation: "Accesskey radšej nepoužívajte, alebo overte, že nekoliduje s bežnými skratkami.",
    wcag: "2.1.4 Klávesové skratky",
    principle: "Ovládateľnosť"
  },
  "landmark-one-main": {
    title: "Stránka má viac hlavných oblastí",
    description: "Na stránke sa nachádza viac ako jeden main.",
    recommendation: "Na stránke ponechajte iba jeden element <main>.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "landmark-unique": {
    title: "Landmarky nie sú jednoznačné",
    description: "Viac rovnakých landmarkov nie je rozlíšených.",
    recommendation: "Rozlište rovnaké landmarky pomocou aria-label alebo aria-labelledby.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "list": {
    title: "Nesprávna štruktúra zoznamu",
    description: "Zoznam neobsahuje správne prvky alebo je nesprávne poskladaný.",
    recommendation: "Použite korektnú štruktúru: ul/ol obsahuje li.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "listitem": {
    title: "Položka zoznamu nemá správneho rodiča",
    description: "Položka zoznamu je mimo ul alebo ol.",
    recommendation: "Umiestnite položky zoznamu do správneho zoznamu ul/ol.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "frame-title": {
    title: "Vnorený rám (iframe) nemá názov",
    description: "Iframe bez title je nejasný pre čítačku obrazovky.",
    recommendation: "Každý iframe musí mať zrozumiteľný názov v atribúte title.",
    wcag: "4.1.2 Názov, rola, hodnota",
    principle: "Robustnosť"
  },
  "image-redundant-alt": {
    title: "Alternatívny text obrázka je zbytočný alebo nepresný",
    description: "Alt text je zbytočne dlhý alebo obsahuje slová, ktoré nepridávajú hodnotu.",
    recommendation: "Použite stručný alt text, ktorý popisuje podstatu obrázka.",
    wcag: "1.1.1 Ne-textový obsah",
    principle: "Vnímateľnosť"
  },
  "empty-heading": {
    title: "Prázdny nadpis",
    description: "Nadpis bez textu narúša štruktúru obsahu.",
    recommendation: "Odstráňte prázdny nadpis alebo doplňte text.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "empty-table-header": {
    title: "Prázdna hlavička tabuľky",
    description: "Hlavička tabuľky neobsahuje text.",
    recommendation: "Doplňte text do buniek hlavičky tabuľky (th).",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "table-duplicate-name": {
    title: "Nejednoznačné názvy tabuľky",
    description: "Názvy alebo hlavičky tabuľky nie sú jednoznačné.",
    recommendation: "Použite jasné a jedinečné názvy/hlavičky tabuliek.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "td-headers-attr": {
    title: "Bunky tabuľky nie sú prepojené s hlavičkami",
    description: "Dátové bunky nemajú správne prepojenie na hlavičky.",
    recommendation: "Použite scope alebo prepojenie headers/id.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "th-has-data-cells": {
    title: "Hlavička tabuľky nepopisuje dáta",
    description: "Element th nie je použitý tak, aby popisoval príslušné dátové bunky.",
    recommendation: "Skontrolujte vzťah medzi th a dátovými bunkami v tabuľke.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "scope-attr-valid": {
    title: "Neplatná hodnota scope v tabuľke",
    description: "Atribút scope má neplatnú alebo nesprávnu hodnotu.",
    recommendation: "Použite povolené hodnoty scope: col, row, colgroup, rowgroup.",
    wcag: "1.3.1 Informácie a vzťahy",
    principle: "Vnímateľnosť"
  },
  "video-caption": {
    title: "Video bez titulkov",
    description: "Video s hovoreným obsahom potrebuje titulky.",
    recommendation: "Pridajte titulky (captions) k videu.",
    wcag: "1.2.2 Titulky (nahrané)",
    principle: "Vnímateľnosť"
  },
  "audio-caption": {
    title: "Audio bez prepisu",
    description: "Audio obsah potrebuje textový prepis alebo titulky.",
    recommendation: "Doplňte prepis zvuku alebo titulky.",
    wcag: "1.2.1 Iba zvuk a iba video (nahrané)",
    principle: "Vnímateľnosť"
  },
  "object-alt": {
    title: "Objekt bez alternatívneho textu",
    description: "Vložený objekt nemá textovú alternatívu.",
    recommendation: "Pre object/embed doplňte alternatívny text.",
    wcag: "1.1.1 Ne-textový obsah",
    principle: "Vnímateľnosť"
  },
  "autocomplete-valid": {
    title: "Neplatná hodnota atribútu autocomplete",
    description: "Formulárové polia nemajú platnú hodnotu atribútu autocomplete.",
    recommendation: "Použite platné hodnoty autocomplete podľa typu poľa.",
    wcag: "1.3.5 Identifikácia účelu vstupu",
    principle: "Vnímateľnosť"
  },
}

const DEFAULT_GUIDANCE = {
  title: "Neznámy problém",
  description: "Tento problém ešte nemá detailný popis.",
  recommendation: "Skontrolujte tento problém manuálne a upravte HTML tak, aby spĺňalo WCAG.",
  recommendationWithDescription: "Skontrolujte tento problém manuálne a upravte HTML tak, aby spĺňalo WCAG (pozrite technický popis vyššie).",
  wcag: "Neurčené",
  principle: "Neurčené"
} as const

export function getGuidance(id?: string, description?: string, help?: string): GuidanceTemplate {
  const guidance = id ? GUIDANCE_BY_ID[id] : undefined
  if (guidance) return guidance

  const hasOriginalText = Boolean(description || help)
  const fallbackTitle = id ? `Neznámy problém prístupnosti (${id})` : DEFAULT_GUIDANCE.title

  return {
    title: fallbackTitle,
    description: hasOriginalText
      ? "Tento typ problému ešte nemá vlastný slovenský popis. Pozrite odporúčanie nižšie."
      : DEFAULT_GUIDANCE.description,
    recommendation: hasOriginalText
      ? DEFAULT_GUIDANCE.recommendationWithDescription
      : DEFAULT_GUIDANCE.recommendation,
    wcag: DEFAULT_GUIDANCE.wcag,
    principle: DEFAULT_GUIDANCE.principle
  }
}

const WCAG_LEVEL_BY_ID: Record<string, string> = {
  'color-contrast': 'AA',
  'meta-viewport': 'AA',
  'autocomplete-valid': 'AA',
  'heading-order': 'A',
  'page-has-main': 'A',
  region: 'A',
  'image-alt': 'A',
  label: 'A',
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
  tabindex: 'A',
  bypass: 'A',
  'landmark-one-main': 'A',
  'landmark-unique': 'A',
  list: 'A',
  listitem: 'A',
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
  accesskeys: 'A'
}

export function getWcagLevel(id?: string, wcag?: string) {
  if (id && WCAG_LEVEL_BY_ID[id]) return WCAG_LEVEL_BY_ID[id]
  if (wcag && wcag.includes('1.4.3')) return 'AA'
  if (wcag && wcag.includes('1.4.10')) return 'AA'
  return 'Neurčené'
}
