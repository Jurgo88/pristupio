<template>
  <section class="page-hero">
    <div class="page-hero__content">
      <span class="kicker">Dashboard</span>
      <h1>WCAG audit prehľad</h1>
      <p class="lead">
        Spustite audit, filtrujte nálezy a zdieľajte report v jednom konzistentnom prehľade.
      </p>
      <div class="hero-tags">
        <span>WCAG 2.1 AA</span>
        <span>EN 301 549</span>
        <span>EAA / WAD</span>
      </div>
    </div>
    <div class="page-hero__aside">
      <div class="page-hero__card">
        <div class="hero-card-title">Rýchly postup</div>
        <ul>
          <li>Zadajte URL a vyberte profil</li>
          <li>Spustite audit a sledujte nálezy</li>
          <li>Exportujte report pre tím</li>
        </ul>
        <div class="hero-card-meta">Automatický audit + manuálny checklist</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-hero {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #111827 100%);
  color: #e2e8f0;
  border: 1px solid #0b1220;
  border-radius: var(--radius);
  padding: 2.6rem;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 2rem;
  align-items: center;
}

.page-hero::before,
.page-hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
  z-index: 0;
}

.page-hero::before {
  width: 360px;
  height: 360px;
  right: -140px;
  top: -120px;
  background: radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.45), transparent 70%);
}

.page-hero::after {
  width: 280px;
  height: 280px;
  left: -120px;
  bottom: -130px;
  background: radial-gradient(circle at 70% 70%, rgba(14, 165, 233, 0.35), transparent 70%);
}

.page-hero__content {
  position: relative;
  z-index: 1;
}

.page-hero__content h1 {
  font-size: clamp(2rem, 1.4rem + 2vw, 3rem);
  line-height: 1.1;
  margin: 0 0 0.8rem;
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
  color: #cbd5f5;
  font-size: 1rem;
  margin: 0;
}

.hero-tags {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-top: 1.2rem;
}

.hero-tags span {
  border: 1px solid #1f2937;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius);
  background: rgba(15, 23, 42, 0.45);
}

.page-hero__card {
  position: relative;
  z-index: 1;
  background: #ffffff;
  color: #0f172a;
  border-radius: var(--radius);
  padding: 1.2rem 1.4rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(226, 232, 240, 0.7);
}

.page-hero__aside {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
}

.hero-card-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.page-hero__card ul {
  margin: 0.8rem 0 0;
  padding-left: 1.1rem;
  color: #475569;
  display: grid;
  gap: 0.4rem;
}

.hero-card-meta {
  margin-top: 0.8rem;
  font-size: 0.82rem;
  color: #64748b;
}

@media (max-width: 1100px) {
  .page-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-hero {
    padding: 2rem 1.6rem;
  }
}
</style>
