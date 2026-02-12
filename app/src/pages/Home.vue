<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { buildLemonCheckoutUrl } from '@/utils/lemon'

const auth = useAuthStore()

const startLink = computed(() => (auth.isLoggedIn ? '/dashboard' : '/login'))
const auditCheckoutBase = import.meta.env.VITE_LEMON_AUDIT_CHECKOUT_URL || ''
const auditCheckoutUrl = computed(() => {
  if (!auth.user || !auditCheckoutBase) return ''
  return buildLemonCheckoutUrl({
    baseUrl: auditCheckoutBase,
    userId: auth.user.id,
    email: auth.user.email
  })
})

let observer: IntersectionObserver | null = null

onMounted(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const revealEls = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))

  if (prefersReduced || revealEls.length === 0) {
    revealEls.forEach((el) => el.classList.add('in-view'))
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          observer?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
  )

  revealEls.forEach((el) => observer?.observe(el))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div class="home">
    <section class="hero reveal">
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">Prístupnosť bez chaosu</span>
          <h1>WCAG audit, ktorý dáva tímu jasný plán a istotu pri kontrole.</h1>
          <p>
            Pristupio používa automatický sken podľa WCAG 2.1 AA a EN 301 549.
            Dostanete prioritizované chyby, konkrétne odporúčania a report pripravený na EAA aj WAD.
          </p>
          <div class="hero-actions">
            <router-link :to="startLink" class="btn btn-primary">Získať free audit</router-link>
            <a href="#pricing" class="btn btn-outline-light btn-ghost">Pozrieť ceny</a>
          </div>
          <p class="hero-note">
            Free audit ukáže skóre, počty a top 3 nálezy. Plné reporty získate v platených balíkoch.
          </p>
          <div class="hero-meta">
            <span>WCAG 2.1 AA</span>
            <span>EN 301 549</span>
            <span>EAA 2019/882</span>
            <span>WAD 2016/2102</span>
          </div>
          <div class="hero-proof">
            <div class="proof-item">
              <strong>Audit s jasným výstupom</strong>
              <span>Prioritizované chyby a odporúčania pre opravy.</span>
            </div>
            <div class="proof-item">
              <strong>Priorita podľa dopadu</strong>
              <span>Najprv riešite bariéry, ktoré blokujú používateľov.</span>
            </div>
            <div class="proof-item">
              <strong>Report pre celý tím</strong>
              <span>Výstup zrozumiteľný pre compliance, produkt aj vývoj.</span>
            </div>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <svg class="hero-orbits" viewBox="0 0 360 360" aria-hidden="true">
            <circle cx="180" cy="180" r="140" />
            <circle cx="180" cy="180" r="100" />
            <circle cx="180" cy="180" r="60" />
            <path d="M60 210c40-50 110-70 170-50 50 17 80 55 110 90" />
          </svg>
          <div class="mockup">
            <div class="mockup-header">
              <div class="mockup-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="mockup-title">Audit report</div>
              <div class="mockup-pill">WCAG 2.1 AA</div>
            </div>
            <div class="mockup-body">
              <div class="mockup-score">
                <div class="score-circle">82</div>
                <div class="score-meta">
                  <strong>Prístupnosť</strong>
                  <span>Index pripravenosti</span>
                </div>
              </div>
              <div class="mockup-bars">
                <div class="bar">
                  <span>Critical</span>
                  <div class="bar-track"><div class="bar-fill critical"></div></div>
                  <small>12 problémov</small>
                </div>
                <div class="bar">
                  <span>Moderate</span>
                  <div class="bar-track"><div class="bar-fill moderate"></div></div>
                  <small>18 problémov</small>
                </div>
                <div class="bar">
                  <span>Minor</span>
                  <div class="bar-track"><div class="bar-fill minor"></div></div>
                  <small>9 problémov</small>
                </div>
              </div>
              <div class="mockup-list">
                <div class="mockup-item">
                  <span class="dot critical"></span>
                  <div>
                    <strong>Nedostatočný kontrast textu</strong>
                    <span>WCAG 1.4.3</span>
                  </div>
                </div>
                <div class="mockup-item">
                  <span class="dot moderate"></span>
                  <div>
                    <strong>Chýbajúce aria-labels</strong>
                    <span>WCAG 4.1.2</span>
                  </div>
                </div>
                <div class="mockup-item">
                  <span class="dot minor"></span>
                  <div>
                    <strong>Nesprávna hierarchia nadpisov</strong>
                    <span>WCAG 1.3.1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="floating-card">
            <div class="floating-title">Pripravenosť na legislatívu</div>
            <ul>
              <li>WAD 2016/2102</li>
              <li>EAA 2019/882</li>
              <li>EN 301 549</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="benefits reveal">
      <div class="section-head">
        <p class="kicker">Prečo na tom záleží</p>
        <h2>Prístupnosť chráni ľudí, znižuje riziko a posilňuje vašu značku.</h2>
        <p class="lead">
          Nedostupné rozhranie znamená stratených používateľov, právne riziko aj reputačný problém.
          Pristupio vám dá kontrolu, jasné priority a komunikáciu zrozumiteľnú pre celý tím.
        </p>
      </div>
      <div class="benefits-grid">
        <article class="benefit-card">
          <div class="benefit-title">Čo tým získate</div>
          <ul>
            <li>Jasný plán opráv podľa dopadu na používateľov.</li>
            <li>Report, ktorý pochopí compliance aj vývoj.</li>
            <li>Rýchly prehľad o stave prístupnosti.</li>
          </ul>
        </article>
        <article class="benefit-card">
          <div class="benefit-title">Pred čím vás to chráni</div>
          <ul>
            <li>Riziko sankcií pri EAA a WAD kontrolách.</li>
            <li>Negatívne reakcie verejnosti a poškodenie značky.</li>
            <li>Dodatočné náklady na chaotické opravy.</li>
          </ul>
        </article>
        <article class="benefit-card">
          <div class="benefit-title">Komu to pomáha</div>
          <ul>
            <li>Používateľom so zrakovým, sluchovým aj motorickým znevýhodnením.</li>
            <li>Produktovým tímom, ktoré potrebujú jasné priority.</li>
            <li>Compliance a právnym oddeleniam.</li>
          </ul>
        </article>
      </div>
    </section>

    <section id="features" class="value reveal">
      <div class="section-head">
        <p class="kicker">Čo získate</p>
        <h2>Prehľadné výstupy pre compliance aj produkt.</h2>
        <p class="lead">
          Získajte jasný obraz o stave prístupnosti a plán opráv, ktorý je zrozumiteľný pre celý tím.
        </p>
      </div>
      <div class="value-grid">
        <article class="value-card">
          <div class="value-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h16" />
              <path d="M4 7h10" />
              <path d="M4 17h7" />
              <path d="M17 9l2 2 4-4" />
            </svg>
          </div>
          <h3>Kritické chyby ako prvé</h3>
          <p>Automaticky triedime podľa dopadu na používateľov aj rizika pre organizáciu.</p>
        </article>
        <article class="value-card">
          <div class="value-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l8 4v6c0 4-3 7-8 8-5-1-8-4-8-8V7l8-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h3>Legislatívny kontext</h3>
          <p>Každý nález je spojený s WCAG kritériom a relevantným rámcom EAA/WAD.</p>
        </article>
        <article class="value-card">
          <div class="value-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4h16v12H7l-3 3V4z" />
              <path d="M7 8h10" />
              <path d="M7 12h6" />
            </svg>
          </div>
          <h3>Akčné odporúčania</h3>
          <p>Praktické kroky pre vývoj a obsah, nie len všeobecné rady.</p>
        </article>
      </div>
    </section>

    <section id="how" class="workflow reveal">
      <div class="section-head">
        <p class="kicker">Ako to funguje</p>
        <h2>Tri kroky k auditom, ktoré obstáli aj pri kontrole.</h2>
      </div>
      <div class="workflow-steps">
        <article class="step-card">
          <span class="step-num">01</span>
          <h3>Zadajte URL a vyberte profil</h3>
          <p>WAD pre verejný sektor alebo EAA pre služby a produkty.</p>
        </article>
        <article class="step-card">
          <span class="step-num">02</span>
          <h3>Spustite audit</h3>
          <p>Automatický sken vyhodnotí chyby a vypočíta skóre.</p>
        </article>
        <article class="step-card">
          <span class="step-num">03</span>
          <h3>Zdieľajte report</h3>
          <p>Výstup pre celý tím s jasným plánom opráv.</p>
        </article>
      </div>
    </section>

    <section id="pricing" class="pricing reveal">
      <div class="section-head">
        <p class="kicker">Cenník</p>
        <h2>Vyberte si úroveň detailu podľa vašej potreby.</h2>
        <p class="lead">
          Začnite free auditom, pokračujte základným auditom a monitoringom podľa potreby.
          Pri ročnom predplatnom monitoringu je základný audit zdarma.
        </p>
      </div>
      <div class="pricing-grid">
        <article class="pricing-card">
          <div class="pricing-header">
            <p class="pricing-title">Free audit</p>
            <p class="pricing-price">0 €</p>
            <p class="pricing-subtitle">Rýchly prehľad</p>
          </div>
          <ul class="pricing-list">
            <li>Skóre prístupnosti</li>
            <li>Počet chýb spolu</li>
            <li>Rýchly prehľad problémov</li>
          </ul>
          <router-link :to="startLink" class="btn btn-outline-dark">Spustiť free audit</router-link>
        </article>

        <article class="pricing-card">
          <div class="pricing-header">
            <p class="pricing-title">Základný audit</p>
            <p class="pricing-price">99 €</p>
            <p class="pricing-subtitle">Jednorazovo</p>
          </div>
          <ul class="pricing-list">
            <li>Plný report s prioritami</li>
            <li>Odporúčania pre opravy</li>
            <li>Legislatívne mapovanie</li>
          </ul>
          <a
            v-if="auth.isLoggedIn && auditCheckoutUrl"
            :href="auditCheckoutUrl"
            class="btn btn-outline-dark"
          >
            Objednať audit
          </a>
          <router-link v-else :to="startLink" class="btn btn-outline-dark">Objednať audit</router-link>
        </article>

        <article class="pricing-card featured">
          <div class="pricing-badge">Najobľúbenejšie</div>
          <div class="pricing-header">
            <p class="pricing-title">Monitoring + report</p>
            <p class="pricing-price">29 € / mesiac</p>
            <p class="pricing-subtitle">Len po základnom audite</p>
          </div>
          <ul class="pricing-list">
            <li>Monitoring 2× mesačne</li>
            <li>Upozornenia + priebežné reporty</li>
          </ul>
          <p class="pricing-note">Pri ročnom predplatnom je základný audit zdarma.</p>
          <router-link :to="startLink" class="btn btn-primary">Spustiť monitoring</router-link>
        </article>

        <article class="pricing-card">
          <div class="pricing-header">
            <p class="pricing-title">Hlbkový audit</p>
            <p class="pricing-price">od 499 €</p>
            <p class="pricing-subtitle">Manuálny + expertný</p>
          </div>
          <ul class="pricing-list">
            <li>Detailný manuálny audit</li>
            <li>Checklist povinností</li>
            <li>Konzultácia s expertom</li>
          </ul>
          <router-link :to="startLink" class="btn btn-outline-dark">Dohodnúť audit</router-link>
        </article>
      </div>
      <div class="pricing-compare">
        <div class="compare-row compare-head">
          <div class="compare-cell">Funkcia</div>
          <div class="compare-cell">Free</div>
          <div class="compare-cell">Základný</div>
          <div class="compare-cell compare-col-featured">Monitoring</div>
          <div class="compare-cell">Hlbkový</div>
        </div>
        <div class="compare-row">
          <div class="compare-cell">Skóre prístupnosti</div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
          <div class="compare-cell compare-col-featured"><span class="compare-yes">✓</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
        </div>
        <div class="compare-row">
          <div class="compare-cell">Počet chýb</div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
          <div class="compare-cell compare-col-featured"><span class="compare-yes">✓</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
        </div>
        <div class="compare-row">
          <div class="compare-cell">Detailný report</div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
          <div class="compare-cell compare-col-featured"><span class="compare-yes">✓</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
        </div>
        <div class="compare-row">
          <div class="compare-cell">Prioritizácia chýb</div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
          <div class="compare-cell compare-col-featured"><span class="compare-yes">✓</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
        </div>
        <div class="compare-row">
          <div class="compare-cell">Odporúčania opráv</div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
          <div class="compare-cell compare-col-featured"><span class="compare-yes">✓</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
        </div>
        <div class="compare-row">
          <div class="compare-cell">Legislatívne mapovanie</div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
          <div class="compare-cell compare-col-featured"><span class="compare-yes">✓</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
        </div>
        <div class="compare-row">
          <div class="compare-cell">Monitoring 2× mesačne</div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell compare-col-featured"><span class="compare-yes">✓</span></div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
        </div>
        <div class="compare-row">
          <div class="compare-cell">Manuálny audit</div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell compare-col-featured"><span class="compare-no">—</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
        </div>
        <div class="compare-row">
          <div class="compare-cell">Konzultácia s expertom</div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell"><span class="compare-no">—</span></div>
          <div class="compare-cell compare-col-featured"><span class="compare-no">—</span></div>
          <div class="compare-cell"><span class="compare-yes">✓</span></div>
        </div>
      </div>
      <div class="pricing-compare-mobile">
        <article class="compare-plan-card">
          <div class="compare-plan-head">
            <p class="compare-plan-name">Free audit</p>
            <p class="compare-plan-price">0 €</p>
          </div>
          <ul class="compare-plan-list">
            <li>Skóre prístupnosti</li>
            <li>Počet chýb</li>
            <li>Rýchly prehľad problémov</li>
          </ul>
        </article>
        <article class="compare-plan-card">
          <div class="compare-plan-head">
            <p class="compare-plan-name">Základný audit</p>
            <p class="compare-plan-price">99 €</p>
          </div>
          <ul class="compare-plan-list">
            <li>Automatický WCAG 2.1 AA audit</li>
            <li>LOW / MED / HIGH chyby + skóre pripravenosti</li>
            <li>PDF report + mapovanie na EN 301 549 / EAA</li>
          </ul>
        </article>
        <article class="compare-plan-card featured">
          <div class="compare-plan-head">
            <p class="compare-plan-name">Monitoring</p>
            <p class="compare-plan-price">29 € / mesiac</p>
          </div>
          <ul class="compare-plan-list">
            <li>Všetko zo základného auditu</li>
            <li>Monitoring 2× mesačne</li>
            <li>Upozornenia + priebežné reporty</li>
          </ul>
        </article>
        <article class="compare-plan-card">
          <div class="compare-plan-head">
            <p class="compare-plan-name">Hlbkový audit</p>
            <p class="compare-plan-price">od 499 €</p>
          </div>
          <ul class="compare-plan-list">
            <li>Detailný manuálny audit</li>
            <li>Checklist povinností</li>
            <li>Konzultácia s expertom</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="compliance reveal">
      <div class="compliance-inner">
        <div>
          <p class="kicker">Pre koho je Pristupio</p>
          <h2>Pre verejné inštitúcie aj komerčné služby.</h2>
          <p class="lead">
            Systém je navrhnutý pre tímy, ktoré potrebujú preukázateľnú zhodu a zrozumiteľný audit
            od verejnej správy až po e-shopy a digitálne služby.
          </p>
        </div>
        <div class="compliance-grid" aria-hidden="true">
          <div class="compliance-card">Verejný sektor</div>
          <div class="compliance-card">Banky a poisťovne</div>
          <div class="compliance-card">E-shopy a retail</div>
          <div class="compliance-card">Doprava a mobilita</div>
          <div class="compliance-card">Vzdelávanie</div>
          <div class="compliance-card">Digitálne služby</div>
        </div>
      </div>
    </section>

    <section id="faq" class="faq reveal">
      <div class="section-head">
        <p class="kicker">FAQ</p>
        <h2>Najčastejšie otázky o audite a monitoringu.</h2>
        <p class="lead">
          Rýchle odpovede na to, čo riešia tímy pred nákupom a počas prvého auditu.
        </p>
      </div>
      <div class="faq-grid">
        <details class="faq-item">
          <summary>Čo je prístupnosť webu a prečo na nej záleží?</summary>
          <p>
            Prístupnosť znamená, že web sa dá používať aj s asistenčnými technológiami (napr. čítačky
            obrazovky) a bez myši, len klávesnicou. V praxi to rieši kontrasty, čitateľnosť, jasnú
            hierarchiu nadpisov, formuláre aj navigáciu. Výsledkom je web, ktorý funguje pre ľudí so
            znevýhodnením, seniorov aj používateľov v horších podmienkach (mobil, slabé svetlo,
            dočasné obmedzenie).
          </p>
        </details>
        <details class="faq-item">
          <summary>Čo dostanem vo free audite?</summary>
          <p>
            Skóre prístupnosti, počet nálezov a stručný prehľad top problémov. Je to rýchly screening,
            ktorý vám dá jasnú predstavu o rozsahu, riziku a pomôže určiť priority pred detailným
            auditom. Hodí sa na prvú diagnostiku a internú diskusiu v tíme.
          </p>
        </details>
        <details class="faq-item">
          <summary>Aký je rozdiel medzi základným auditom a monitoringom?</summary>
          <p>
            Základný audit je jednorazový detailný report s odporúčaniami. Monitoring opakuje sken
            2× mesačne, sleduje zmeny, porovnáva trend a upozorňuje na nové chyby po úpravách webu
            alebo nasadení nových funkcií. Vďaka tomu máte prehľad, či sa dostupnosť zlepšuje alebo
            zhoršuje, a nemusíte robiť audit od nuly po každej zmene.
          </p>
        </details>
        <details class="faq-item">
          <summary>Aký zákon to vyžaduje na Slovensku?</summary>
          <p>
            Pre verejný sektor platí smernica (EÚ) 2016/2102 a jej transpozícia v SR cez zákon
            č. 95/2019 Z. z. o IT vo verejnej správe. Pre komerčné služby a produkty platí zákon
            č. 351/2022 Z. z. o prístupnosti výrobkov a služieb, ktorý vychádza z EAA 2019/882.
            Výnimky a presný rozsah povinností závisia od typu služby a subjektu.
          </p>
        </details>
        <details class="faq-item">
          <summary>Dokedy musia byť weby prístupné?</summary>
          <p>
            Verejný sektor: nové weby od 23. 9. 2019, všetky ostatné weby od 23. 9. 2020 a mobilné
            aplikácie od 23. 6. 2021. EAA požiadavky sa v EÚ uplatňujú od 28. 6. 2025 a zákon
            351/2022 Z. z. je účinný od 28. 6. 2025.
          </p>
        </details>
        <details class="faq-item">
          <summary>Čo potrebujem na spustenie auditu?</summary>
          <p>
            Stačí URL a výber profilu (WAD alebo EAA). Sken je automatický a nevyžaduje integráciu do kódu.
          </p>
        </details>
        <details class="faq-item">
          <summary>Pomôže mi audit aj pre vývoj?</summary>
          <p>
            Áno. Každý nález obsahuje prioritu, popis problému a akčné odporúčanie, takže vývoj vie
            rýchlo určiť ďalší krok.
          </p>
        </details>
        <details class="faq-item">
          <summary>Kde nájdem znenie smerníc a zákonov?</summary>
          <p>
            SR zákon 351/2022 Z. z.: <a href="https://www.slov-lex.sk/static/pdf/2022/351/ZZ_2022_351_20250628.pdf">Slov-Lex</a>.
            SR zákon 95/2019 Z. z.: <a href="https://static.slov-lex.sk/pdf/SK/ZZ/2019/95/ZZ_2019_95_20250628.pdf">Slov-Lex</a>.
            Smernica (EÚ) 2016/2102: <a href="https://eur-lex.europa.eu/EN/legal-content/summary/accessibility-of-public-sector-websites-and-mobile-apps.html">EUR-Lex</a>.
            EAA 2019/882: <a href="https://eur-lex.europa.eu/eli/dir/2019/882/oj">EUR-Lex</a>.
          </p>
        </details>
      </div>
    </section>

    <section class="cta reveal">
      <div class="cta-inner">
        <div>
          <h2>Pripravení na audit prístupnosti?</h2>
          <p>Začnite free auditom a vyberte si balík, ktorý zodpovedá vašej potrebe.</p>
        </div>
        <router-link :to="startLink" class="btn btn-light">Spustiť free audit</router-link>
      </div>
    </section>

  </div>
</template>

<style scoped>
.home {
  padding: 1.5rem 0 4.5rem;
  display: grid;
  gap: 4rem;
}

.reveal {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.6s ease, transform 0.6s ease;
  will-change: opacity, transform;
}

.reveal.in-view {
  opacity: 1;
  transform: translateY(0);
}

.hero {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #111827 100%);
  color: #e5e7eb;
  border: 1px solid #0b1220;
  border-radius: var(--radius);
  padding: 3rem;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
}

.hero::before,
.hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(0px);
  opacity: 0.6;
  z-index: 0;
}

.hero::before {
  width: 420px;
  height: 420px;
  right: -140px;
  top: -120px;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.45), transparent 70%);
}

.hero::after {
  width: 320px;
  height: 320px;
  left: -140px;
  bottom: -140px;
  background: radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.35), transparent 70%);
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 2.75rem;
  align-items: center;
}

.eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 0.7rem;
}

.hero-copy h1 {
  font-size: clamp(2.2rem, 1.6rem + 2.2vw, 3.4rem);
  line-height: 1.1;
  margin-bottom: 1rem;
}

.hero-copy p {
  font-size: 1.05rem;
  color: #cbd5f5;
  margin-bottom: 1.6rem;
  max-width: 38rem;
}

.hero-note {
  margin: 1rem 0 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.hero-actions {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.hero-actions .btn {
  border-radius: var(--radius);
  padding: 0.65rem 1.5rem;
  font-weight: 600;
}

.hero-actions .btn-primary {
  background: linear-gradient(135deg, #1d4ed8, #1e40af);
  border: none;
  box-shadow: 0 12px 24px rgba(30, 64, 175, 0.35);
}

.btn-ghost {
  border-color: rgba(226, 232, 240, 0.35);
  color: #e2e8f0;
}

.btn-ghost:hover {
  background: rgba(148, 163, 184, 0.18);
  color: #f8fafc;
}

.hero-meta {
  margin-top: 1.4rem;
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #94a3b8;
}

.hero-meta span {
  border: 1px solid #1f2937;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius);
  background: rgba(15, 23, 42, 0.45);
}

.hero-proof {
  margin-top: 1.6rem;
  display: grid;
  gap: 0.9rem;
}

.proof-item {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid #1f2937;
  border-radius: var(--radius);
  padding: 0.8rem 1rem;
  display: grid;
  gap: 0.25rem;
}

.proof-item strong {
  color: #f8fafc;
  font-size: 0.95rem;
}

.proof-item span {
  color: #94a3b8;
  font-size: 0.85rem;
}

.hero-visual {
  position: relative;
}

.hero-orbits {
  position: absolute;
  inset: -40px -40px auto auto;
  width: 320px;
  height: 320px;
  stroke: rgba(148, 163, 184, 0.25);
  stroke-width: 1.2;
  fill: none;
  opacity: 0.6;
}

.mockup {
  background: #0b1220;
  border-radius: var(--radius);
  border: 1px solid #1f2937;
  padding: 1.2rem 1.4rem 1.3rem;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.55);
  animation: floatCard 9s ease-in-out infinite;
}

.mockup-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.mockup-dots {
  display: flex;
  gap: 0.35rem;
}

.mockup-dots span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: #334155;
}

.mockup-title {
  color: #e2e8f0;
  font-weight: 600;
}

.mockup-pill {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius);
  border: 1px solid #334155;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.8);
}

.mockup-score {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.8rem;
  align-items: center;
  margin-bottom: 1rem;
}

.score-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #0b1220;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  box-shadow: 0 8px 18px rgba(22, 163, 74, 0.35);
}

.score-meta strong {
  color: #e2e8f0;
}

.score-meta span {
  display: block;
  color: #94a3b8;
  font-size: 0.85rem;
}

.mockup-bars {
  display: grid;
  gap: 0.7rem;
  margin-bottom: 1.1rem;
}

.bar {
  display: grid;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.bar-track {
  height: 8px;
  background: #111827;
  border-radius: var(--radius);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius);
}

.bar-fill.critical {
  width: 72%;
  background: linear-gradient(90deg, #ef4444, #b91c1c);
}

.bar-fill.moderate {
  width: 55%;
  background: linear-gradient(90deg, #f59e0b, #b45309);
}

.bar-fill.minor {
  width: 35%;
  background: linear-gradient(90deg, #38bdf8, #0284c7);
}

.mockup-list {
  display: grid;
  gap: 0.75rem;
}

.mockup-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.6rem;
  align-items: start;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid #1f2937;
  border-radius: var(--radius);
  padding: 0.6rem 0.7rem;
}

.mockup-item strong {
  color: #e2e8f0;
  font-size: 0.82rem;
}

.mockup-item span {
  color: #94a3b8;
  font-size: 0.75rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius);
  margin-top: 0.35rem;
}

.dot.critical {
  background: #ef4444;
}

.dot.moderate {
  background: #f59e0b;
}

.dot.minor {
  background: #38bdf8;
}

.floating-card {
  position: absolute;
  right: -12px;
  bottom: -24px;
  background: #ffffff;
  color: #0f172a;
  border-radius: var(--radius);
  padding: 0.9rem 1rem;
  width: 220px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(226, 232, 240, 0.7);
  animation: floatCard 8s ease-in-out infinite 0.8s;
}

.floating-title {
  font-weight: 700;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.floating-card ul {
  margin: 0;
  padding-left: 1rem;
  color: #475569;
  font-size: 0.8rem;
}

.section-head {
  display: grid;
  gap: 0.5rem;
}

.benefits {
  display: grid;
  gap: 2rem;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.benefit-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.4rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.benefit-title {
  font-weight: 700;
  margin-bottom: 0.8rem;
  color: #0f172a;
}

.benefit-card ul {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--text-muted);
  display: grid;
  gap: 0.5rem;
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
}

.section-head h2 {
  font-size: clamp(1.7rem, 1.2rem + 1.4vw, 2.4rem);
  margin: 0;
}

.lead {
  color: #64748b;
  font-size: 1.02rem;
}

.value {
  display: grid;
  gap: 2rem;
}

.value-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.value-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.4rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.75rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.value-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
}

.value-card h3 {
  margin: 0;
  font-size: 1.05rem;
}

.value-card p {
  color: var(--text-muted);
  margin: 0;
}

.value-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  background: rgba(29, 78, 216, 0.1);
  display: grid;
  place-items: center;
}

.value-icon svg {
  width: 22px;
  height: 22px;
  stroke: #1d4ed8;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.workflow {
  display: grid;
  gap: 2rem;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.pricing {
  display: grid;
  gap: 2rem;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.5rem;
}

.pricing-compare {
  margin-top: 1.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.compare-row {
  display: grid;
  grid-template-columns: 1.4fr repeat(4, minmax(0, 1fr));
  align-items: center;
  border-top: 1px solid var(--border);
}

.compare-row:first-child {
  border-top: none;
}

.compare-cell {
  padding: 0.9rem 1rem;
  font-size: 0.92rem;
  color: var(--text-muted);
}

.compare-head .compare-cell {
  font-weight: 700;
  color: #0f172a;
  background: var(--surface-2);
}

.compare-row .compare-cell:not(:first-child) {
  text-align: center;
}

.compare-col-featured {
  background: rgba(29, 78, 216, 0.08);
}

.compare-yes {
  color: #16a34a;
  font-weight: 700;
  font-size: 1.05rem;
}

.compare-no {
  color: #94a3b8;
  font-weight: 600;
  font-size: 1rem;
}

.pricing-compare-mobile {
  display: none;
}

.compare-plan-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.4rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.9rem;
}

.compare-plan-card.featured {
  border-color: rgba(29, 78, 216, 0.6);
  box-shadow: 0 18px 40px rgba(29, 78, 216, 0.18);
}

.compare-plan-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.compare-plan-name {
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.compare-plan-price {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
  font-weight: 600;
}

.compare-plan-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.compare-plan-list li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  align-items: start;
}

.compare-plan-list li::before {
  content: '✓';
  color: #16a34a;
  font-weight: 700;
  line-height: 1.2;
}

.pricing-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.6rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1.2rem;
  position: relative;
}

.pricing-card.featured {
  border-color: rgba(29, 78, 216, 0.6);
  box-shadow: 0 20px 44px rgba(29, 78, 216, 0.18);
}

.pricing-badge {
  position: absolute;
  top: -12px;
  right: 16px;
  background: #1d4ed8;
  color: #fff;
  padding: 0.3rem 0.7rem;
  font-size: 0.7rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.pricing-header {
  display: grid;
  gap: 0.35rem;
}

.pricing-title {
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.pricing-price {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.pricing-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.pricing-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.pricing-card .btn {
  justify-self: start;
  padding: 0.6rem 1.3rem;
  border-radius: var(--radius);
  font-weight: 600;
}

.btn-outline-dark {
  border: 1px solid #1f2937;
  color: #0f172a;
  background: transparent;
}

.btn-outline-dark:hover {
  background: #0f172a;
  color: #f8fafc;
}

.step-card {
  background: #0f172a;
  color: #e2e8f0;
  border-radius: var(--radius);
  padding: 1.6rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.2);
  transition: transform 0.3s ease;
}

.step-card:hover {
  transform: translateY(-6px);
}

.step-card p {
  color: #94a3b8;
}

.step-num {
  display: inline-block;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.18em;
  margin-bottom: 0.6rem;
}

.compliance {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2.5rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.compliance-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
  gap: 2rem;
  align-items: center;
}

.compliance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.compliance-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem 0.9rem;
  text-align: center;
  font-size: 0.9rem;
  color: #475569;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.compliance-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
}

.faq {
  display: grid;
  gap: 2rem;
}

.faq-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.faq-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.1rem 1.2rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.faq-item summary {
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.faq-item summary::after {
  content: '';
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--border);
  display: inline-block;
  background:
    linear-gradient(#1d4ed8, #1d4ed8) center/12px 2px no-repeat,
    linear-gradient(#1d4ed8, #1d4ed8) center/2px 12px no-repeat;
  transition: transform 0.2s ease;
}

.faq-item[open] summary::after {
  background:
    linear-gradient(#1d4ed8, #1d4ed8) center/12px 2px no-repeat;
  transform: rotate(180deg);
}

.faq-item p {
  margin: 0.8rem 0 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.cta {
  background: linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%);
  border-radius: var(--radius);
  padding: 2.5rem 2.8rem;
  color: #f8fafc;
  box-shadow: 0 20px 40px rgba(14, 116, 144, 0.3);
}

.cta-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.cta h2 {
  margin: 0 0 0.6rem;
}

.cta p {
  margin: 0;
  color: rgba(248, 250, 252, 0.85);
}

.cta .btn-light {
  border-radius: var(--radius);
  padding: 0.7rem 1.6rem;
  font-weight: 700;
}


@keyframes floatCard {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  .mockup,
  .floating-card,
  .value-card,
  .step-card,
  .compliance-card {
    animation: none !important;
    transition: none !important;
  }

  .reveal {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 1100px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }

  .hero {
    padding: 2.2rem;
  }

  .floating-card {
    position: static;
    margin-top: 1.5rem;
    width: 100%;
  }

  .hero-orbits {
    right: -60px;
    top: -40px;
  }
}

@media (max-width: 980px) {
  .benefits-grid,
  .value-grid,
  .workflow-steps,
  .pricing-grid,
  .compliance-inner,
  .faq-grid {
    grid-template-columns: 1fr;
  }

  .pricing-compare {
    display: none;
  }

  .pricing-compare-mobile {
    display: grid;
    gap: 1rem;
  }

  .compliance-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 1.6rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .cta {
    padding: 2rem 1.6rem;
  }
}
</style>
