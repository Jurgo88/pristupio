export const formatTarget = (target?: string[]) => {
  if (!Array.isArray(target)) return ''
  return target.join(', ')
}

export const describeTarget = (target?: string[]) => {
  if (!Array.isArray(target) || target.length === 0) return 'Prvok na stránke'
  const selector = target[0]

  if (selector === 'html') return 'Dokument (html)'
  if (selector === 'body') return 'Telo stránky (body)'
  if (selector.includes('header')) return 'Hlavička stránky'
  if (selector.includes('nav')) return 'Navigácia'
  if (selector.includes('main')) return 'Hlavný obsah'
  if (selector.includes('footer')) return 'Pätička'
  if (selector.includes('section')) return 'Sekcia'
  if (selector.includes('form')) return 'Formulár'
  if (selector.includes('table')) return 'Tabuľka'
  if (selector.includes('thead') || selector.includes('th')) return 'Hlavička tabuľky'
  if (selector.includes('tbody') || selector.includes('td')) return 'Bunka tabuľky'
  if (selector.includes('ul') || selector.includes('ol')) return 'Zoznam'
  if (selector.includes('li')) return 'Položka zoznamu'
  if (selector.includes('iframe')) return 'Vložený obsah (iframe)'
  if (selector.includes('button')) return 'Tlačidlo'
  if (selector.includes('input')) return 'Formulárové pole'
  if (selector.includes('textarea')) return 'Textové pole'
  if (selector.includes('select')) return 'Výberové pole'
  if (selector.includes('a')) return 'Odkaz'
  if (selector.includes('img')) return 'Obrázok'
  if (selector.includes('h1')) return 'Nadpis úrovne 1'
  if (selector.includes('h2')) return 'Nadpis úrovne 2'
  if (selector.includes('h3')) return 'Nadpis úrovne 3'
  if (selector.includes('h4')) return 'Nadpis úrovne 4'
  if (selector.includes('h5')) return 'Nadpis úrovne 5'
  if (selector.includes('h6')) return 'Nadpis úrovne 6'
  if (selector.includes('.')) return 'Prvok s CSS triedou'
  if (selector.includes('#')) return 'Prvok s konkrétnym ID'
  return 'Prvok na stránke'
}
