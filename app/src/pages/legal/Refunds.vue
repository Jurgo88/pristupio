<template>
  <section class="legal-page">
    <header class="legal-header">
      <h1>Refund&#225;cie a vr&#225;tenie platieb</h1>
      <p class="legal-meta">Posledn&#225; aktualiz&#225;cia: 5. febru&#225;r 2026</p>
    </header>

    <div class="legal-content">
      <p>
        T&#225;to politika vysvet&#318;uje podmienky refund&#225;ci&#237; pri pou&#382;&#237;van&#237; slu&#382;by Pristupio.
      </p>

      <h2>1. 14-d&#328;ov&#225; lehota pre spotrebite&#318;ov</h2>
      <p>
        Ak ste spotrebite&#318;, m&#244;&#382;ete po&#382;iada&#357; o refund&#225;ciu do 14 dn&#237; od uzatvorenia zmluvy, pokia&#318;
        z&#225;kon neustanovuje v&#253;nimku. Ak z&#225;kon vy&#382;aduje dlh&#353;iu lehotu, postupujeme pod&#318;a neho.
      </p>

      <h2>2. Digit&#225;lne slu&#382;by</h2>
      <p>
        Pr&#225;vo na odst&#250;penie sa nemus&#237; uplatni&#357; napr&#237;klad pri plne poskytnut&#253;ch slu&#382;b&#225;ch, ak ste
        v&#253;slovne s&#250;hlasili so za&#269;at&#237;m plnenia po&#269;as lehoty na odst&#250;penie a uznali ste stratu tohto
        pr&#225;va, alebo pri online digit&#225;lnom obsahu, ktor&#253; ste za&#269;ali s&#357;ahova&#357; &#269;i streamova&#357; po tom,
        ako ste v&#253;slovne s&#250;hlasili so za&#269;at&#237;m plnenia.
      </p>

      <h2>3. Predplatn&#233;</h2>
      <p>
        Predplatn&#233; m&#244;&#382;ete zru&#353;i&#357; kedyko&#318;vek. Pr&#237;stup zost&#225;va akt&#237;vny do konca zaplaten&#233;ho obdobia.
        &#352;tandardne nevraciame pomern&#250; &#269;as&#357; u&#382; zaplaten&#233;ho obdobia.
      </p>

      <h2>4. Ako po&#382;iada&#357; o refund&#225;ciu</h2>
      <p>
        Nap&#237;&#353;te n&#225;m na <strong>support@pristupio.sk</strong> a uve&#271;te e-mail z objedn&#225;vky, n&#225;zov
        produktu a stru&#269;n&#253; d&#244;vod. Platby sprac&#250;va Merchant of Record Lemon Squeezy, refund&#225;cia bude
        vykonan&#225; cez p&#244;vodn&#250; platobn&#250; met&#243;du.
      </p>

      <h2>5. &#268;as spracovania</h2>
      <p>
        Refund&#225;cie sprac&#250;vame bez zbyto&#269;n&#233;ho odkladu. Prip&#237;sanie platby z&#225;vis&#237; od banky alebo
        poskytovate&#318;a karty a m&#244;&#382;e trva&#357; nieko&#318;ko pracovn&#253;ch dn&#237;.
      </p>

      <h2>6. MoR z&#225;sady</h2>
      <p>
        Lemon Squeezy ako Merchant of Record m&#244;&#382;e v od&#244;vodnen&#253;ch pr&#237;padoch spracova&#357; refund&#225;ciu aj
        mimo na&#353;ej politiky, vr&#225;tane refund&#225;cie do 60 dn&#237; od n&#225;kupu (napr. z d&#244;vodu prevencie
        chargebackov alebo podvodov).
      </p>
    </div>
  </section>
</template>

<style scoped>
.legal-page {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2.4rem;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  max-width: 900px;
  margin: 0 auto;
}

.legal-header {
  margin-bottom: 1.6rem;
}

.legal-header h1 {
  margin: 0 0 0.4rem;
  font-size: clamp(2rem, 1.5rem + 1.4vw, 2.6rem);
}

.legal-meta {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.legal-content {
  display: grid;
  gap: 1.2rem;
  color: #475569;
}

.legal-content h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.legal-content p {
  margin: 0;
}

@media (max-width: 640px) {
  .legal-page {
    padding: 1.6rem;
  }
}
</style>
