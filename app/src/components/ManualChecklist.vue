<template>
  <section class="manual-checklist">
    <div class="checklist-head">
      <div>
        <p class="kicker">Manuálny checklist</p>
        <h3>Manuálne overenia</h3>
      </div>
      <span class="profile-pill">{{ profileLabel }}</span>
    </div>
    <p class="lead">
      Toto sú kroky, ktoré sa nedajú spoľahlivo automatizovať. Je to doplnok k automatickým testom.
    </p>

    <div class="checklist-section">
      <h4>Konformita WCAG 2.1 (AA)</h4>
      <div class="checklist-item">Over, že stránka spĺňa úroveň AA (WCAG 2.1).</div>
      <div class="checklist-item">Over, že sú hodnotené celé stránky, nie iba časti.</div>
      <div class="checklist-item">Over, že kompletné procesy sú prístupné (napr. registrácia, nákup, platba).</div>
      <div class="checklist-item">Over, že sa používajú iba technológie podporované prístupnosťou.</div>
      <div class="checklist-item">Over, že obsah nebráni prístupu (non-interference).</div>
    </div>

    <div class="checklist-section">
      <h4>Vnímateľnosť (Perceivable)</h4>
      <div class="checklist-item">Alt texty reálne opisujú význam obrázkov (nie iba generické slová).</div>
      <div class="checklist-item">Video má titulky a audio má prepis tam, kde je to potrebné.</div>
      <div class="checklist-item">Informácie nie sú vyjadrené iba farbou (napr. chyba iba červenou).</div>
      <div class="checklist-item">Text je čitateľný aj pri zväčšení (200% a viac), bez straty obsahu.</div>
    </div>

    <div class="checklist-section">
      <h4>Ovládateľnosť (Operable)</h4>
      <div class="checklist-item">Celý web je ovládateľný klávesnicou bez pascí focusu.</div>
      <div class="checklist-item">Poriadok focusu je logický a zodpovedá vizuálnemu poradiu.</div>
      <div class="checklist-item">Viditeľný focus je jasný na všetkých interaktívnych prvkoch.</div>
      <div class="checklist-item">Časové limity majú možnosť predĺženia alebo vypnutia.</div>
    </div>

    <div class="checklist-section">
      <h4>Zrozumiteľnosť (Understandable)</h4>
      <div class="checklist-item">Jazyk stránky aj zmeny jazyka v texte sú správne označené.</div>
      <div class="checklist-item">Formuláre majú jasné inštrukcie a chybové hlášky sú zrozumiteľné.</div>
      <div class="checklist-item">Navigácia a rozloženie sú konzistentné naprieč stránkami.</div>
    </div>

    <div class="checklist-section">
      <h4>Robustnosť (Robust)</h4>
      <div class="checklist-item">Obsah funguje s bežnými čítačkami obrazovky (NVDA, VoiceOver).</div>
      <div class="checklist-item">Vlastné UI komponenty majú správne ARIA role a stavy.</div>
    </div>

    <div class="note">
      Poznámka: EN 301 549 vychádza z WCAG 2.1 AA a obsahuje aj ďalšie požiadavky mimo WCAG.
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ profile: 'wad' | 'eaa' }>()

const profileLabel = computed(() => {
  return props.profile === 'eaa' ? 'EAA (2019/882)' : 'WAD (2016/2102)'
})
</script>

<style scoped>
.manual-checklist {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.3rem;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  display: grid;
  gap: 0.9rem;
}

.checklist-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 700;
  margin: 0 0 0.4rem;
}

.lead {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.92rem;
}

.profile-pill {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.35rem 0.65rem;
  color: #1e293b;
  font-weight: 700;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.checklist-section {
  display: grid;
  gap: 0.4rem;
}

.checklist-section h4 {
  margin: 0.2rem 0 0.2rem;
  font-size: 0.95rem;
  color: #0f172a;
}

.checklist-item {
  padding: 0.25rem 0;
  border-bottom: 1px dashed var(--border);
  color: #475569;
}

.checklist-item:last-child {
  border-bottom: 0;
}

.note {
  color: var(--text-muted);
  font-size: 0.88rem;
}

@media (max-width: 640px) {
  .manual-checklist {
    padding: 1.1rem;
  }
}
</style>
