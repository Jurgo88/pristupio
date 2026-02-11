<script setup lang="ts">
defineProps<{
  showPreview: boolean
  paymentNotice: boolean
  showUpgrade: boolean
  showPaidStatus: boolean
  paidCredits: number
  auditCheckoutUrl: string
  refreshPlanLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh-plan'): void
}>()
</script>

<template>
  <section v-if="showPreview" class="panel preview-banner">
    <p class="kicker">Free audit preview</p>
    <h2>Vidis len rychly prehlad problemov</h2>
    <p class="lead">
      Free audit ukazuje skore, pocty a top 3 nalezy. Detailne odporucania a plny report su
      dostupne v zakladnom audite.
    </p>
  </section>

  <section v-if="paymentNotice" class="panel payment-banner">
    <p class="kicker">Platba</p>
    <h2>Ďakujeme, platba prebehla.</h2>
    <p class="lead">
      Ak sa prístup ešte neodomkol, kliknite na "Už som zaplatil" a obnovíme stav z Lemon
      Squeezy.
    </p>
    <div class="upgrade-actions">
      <button class="btn btn-outline" @click="emit('refresh-plan')" :disabled="refreshPlanLoading">
        {{ refreshPlanLoading ? 'Overujem...' : 'Už som zaplatil' }}
      </button>
    </div>
  </section>

  <section v-if="showUpgrade" class="panel upgrade-panel">
    <div>
      <p class="kicker">Základný audit</p>
      <h2>Odomknite celý report a odporúčania.</h2>
      <p class="lead">
        Po platbe sa vám odomkne plný výstup a export PDF. Po zaplatení stačí spustiť audit ešte
        raz.
      </p>
    </div>
    <div class="upgrade-actions">
      <a v-if="auditCheckoutUrl" :href="auditCheckoutUrl" class="btn btn-primary"> Objednať audit (99 €) </a>
      <button class="btn btn-outline" @click="emit('refresh-plan')" :disabled="refreshPlanLoading">
        {{ refreshPlanLoading ? 'Overujem...' : 'Už som zaplatil' }}
      </button>
    </div>
  </section>

  <section v-if="showPaidStatus" class="panel paid-banner">
    <p class="kicker">Základný audit</p>
    <h2 v-if="paidCredits <= 0">Nemáte dostupný kredit.</h2>
    <h2 v-else>Máte dostupný kredit na audit.</h2>
    <p class="lead" v-if="paidCredits <= 0">Objednajte ďalší audit a spravte nový report.</p>
    <p class="lead" v-else>
      Môžete spustiť audit a získať plný report, odporúčania a export PDF.
    </p>
    <div class="history-stats">
      <span>Kredity: {{ paidCredits }}</span>
    </div>
    <div class="upgrade-actions">
      <a v-if="auditCheckoutUrl" :href="auditCheckoutUrl" class="btn btn-outline">
        Objednať ďalší audit
      </a>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.8rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
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
  font-size: 1rem;
  margin: 0;
}

.preview-banner {
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(14, 165, 233, 0.08));
  border-color: rgba(37, 99, 235, 0.35);
}

.preview-banner h2 {
  margin: 0.2rem 0 0.6rem;
}

.payment-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(34, 197, 94, 0.08));
  border-color: rgba(16, 185, 129, 0.4);
}

.paid-banner {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(14, 116, 144, 0.08));
  border-color: rgba(14, 116, 144, 0.35);
}

.upgrade-panel {
  display: grid;
  gap: 1.2rem;
}

.upgrade-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  align-items: center;
}

.history-stats {
  display: flex;
  gap: 0.8rem;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.btn {
  border-radius: var(--radius);
  font-weight: 600;
  padding: 0.65rem 1.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--brand), #1e40af);
  border: none;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(29, 78, 216, 0.3);
}

.btn-outline {
  border: 1px solid var(--border);
  background: transparent;
  color: #0f172a;
}
</style>
