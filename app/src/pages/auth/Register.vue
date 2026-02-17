<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const accountType = ref<'company' | 'personal'>('company')
const firstName = ref('')
const lastName = ref('')
const companyName = ref('')
const companyRole = ref('')
const companyIco = ref('')
const companyDic = ref('')
const companyIcdph = ref('')
const phone = ref('')
const website = ref('')
const consentTerms = ref(false)
const consentPrivacy = ref(false)
const consentMarketing = ref(false)
const formError = ref<string | null>(null)

const handleRegister = async () => {
  formError.value = null
  if (password.value !== passwordConfirm.value) {
    formError.value = 'Heslá sa nezhodujú.'
    return
  }

  if (!consentTerms.value || !consentPrivacy.value) {
    formError.value = 'Pre registráciu musíš súhlasiť s podmienkami a ochranou súkromia.'
    return
  }

  const fullName = `${firstName.value} ${lastName.value}`.trim()
  try {
    await auth.signUp({
      email: email.value.trim(),
      password: password.value,
      metadata: {
        account_type: accountType.value,
        first_name: firstName.value.trim(),
        last_name: lastName.value.trim(),
        full_name: fullName,
        company_name: companyName.value.trim(),
        company_role: companyRole.value.trim(),
        company_ico: companyIco.value.trim(),
        company_dic: companyDic.value.trim(),
        company_icdph: companyIcdph.value.trim(),
        phone: phone.value.trim(),
        website: website.value.trim(),
        consent_terms: consentTerms.value,
        consent_privacy: consentPrivacy.value,
        consent_marketing: consentMarketing.value
      }
    })
    if (!auth.authError) {
      alert('Registrácia prebehla, skontroluj si mail (alebo spam).')
    }
  } catch (_err) {
    // Error is displayed via auth.authError
  }
}
</script>

<template>
  <div class="auth-form">
    <h2>Registrácia</h2>
    <form @submit.prevent="handleRegister">
      <div class="form-section">
        <p class="section-title">Typ účtu</p>
        <div class="account-type">
          <label class="option">
            <input v-model="accountType" type="radio" value="company" />
            <span>Firma</span>
          </label>
          <label class="option">
            <input v-model="accountType" type="radio" value="personal" />
            <span>Súkromná osoba</span>
          </label>
        </div>
      </div>

      <div class="form-section">
        <p class="section-title">Kontakt</p>
        <div class="form-grid">
          <label class="field">
            <span>Meno</span>
            <input v-model="firstName" type="text" autocomplete="given-name" />
          </label>
          <label class="field">
            <span>Priezvisko</span>
            <input v-model="lastName" type="text" autocomplete="family-name" />
          </label>
          <label class="field">
            <span>Email <span class="required-mark" aria-hidden="true">*</span></span>
            <input v-model="email" type="email" autocomplete="email" required />
          </label>
          <label class="field">
            <span>Telefón</span>
            <input v-model="phone" type="tel" autocomplete="tel" />
          </label>
        </div>
      </div>

      <div v-if="accountType === 'company'" class="form-section">
        <p class="section-title">Firma</p>
        <p class="section-note">
          Firemné údaje využijeme výhradne na vystavenie faktúry.
        </p>
        <div class="form-grid">
          <label class="field full">
            <span>Názov firmy</span>
            <input v-model="companyName" type="text" autocomplete="organization" />
          </label>
          <label class="field">
            <span>Pozícia / rola</span>
            <input v-model="companyRole" type="text" autocomplete="organization-title" />
          </label>
          <label class="field">
            <span>Webstránka</span>
            <input v-model="website" type="url" placeholder="https://..." />
          </label>
          <label class="field">
            <span>ICO</span>
            <input v-model="companyIco" type="text" inputmode="numeric" />
          </label>
          <label class="field">
            <span>DIC</span>
            <input v-model="companyDic" type="text" inputmode="numeric" />
          </label>
          <label class="field">
            <span>IC DPH</span>
            <input v-model="companyIcdph" type="text" />
          </label>
        </div>
      </div>

      <div class="form-section">
        <p class="section-title">Prihlasovacie údaje</p>
        <div class="form-grid">
          <label class="field">
            <span>Heslo <span class="required-mark" aria-hidden="true">*</span></span>
            <input v-model="password" type="password" autocomplete="new-password" minlength="6" required />
          </label>
          <label class="field">
            <span>Heslo znova <span class="required-mark" aria-hidden="true">*</span></span>
            <input
              v-model="passwordConfirm"
              type="password"
              autocomplete="new-password"
              minlength="6"
              required
            />
          </label>
        </div>
      </div>

      <div class="form-section">
        <p class="section-title">Súhlas</p>
        <label class="consent required">
          <input v-model="consentTerms" type="checkbox" required />
          <span>
            Súhlasím s podmienkami používania <span class="required-mark" aria-hidden="true">*</span>
            <router-link to="/terms">Zobraziť podmienky</router-link>
          </span>
        </label>
        <label class="consent required">
          <input v-model="consentPrivacy" type="checkbox" required />
          <span>
            Súhlasím s ochranou súkromia <span class="required-mark" aria-hidden="true">*</span>
            <router-link to="/privacy">Zobraziť ochranu súkromia</router-link>
          </span>
        </label>
        <label class="consent">
          <input v-model="consentMarketing" type="checkbox" />
          <span>
            Súhlasím s kontaktovaním ohľadom ponuky a doplňujúcich služieb.
          </span>
        </label>
      </div>

      <button type="submit" :disabled="auth.loading">
        {{ auth.loading ? 'Pracujem...' : 'Vytvoriť účet' }}
      </button>

      <p v-if="formError" class="error">
        {{ formError }}
      </p>
      <p v-if="auth.authError" class="error">
        {{ auth.authError }}
      </p>
    </form>
  </div>
</template>

<style scoped>
.auth-form {
  max-width: 760px;
  margin: 3rem auto;
  padding: 2.5rem;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.auth-form h2 {
  margin: 0 0 1.4rem;
  font-size: 1.8rem;
  color: var(--text);
}

form {
  display: grid;
  gap: 1.6rem;
}

.form-section {
  display: grid;
  gap: 0.9rem;
}

.section-title {
  margin: 0;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
}

.section-note {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.account-type {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
}

.account-type .option {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 600;
  color: var(--text);
}

.account-type .option input {
  accent-color: var(--brand);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.2rem;
}

.field {
  display: grid;
  gap: 0.4rem;
  font-size: 0.95rem;
  color: var(--text);
}

.field span {
  font-weight: 600;
}

.required-mark {
  color: var(--danger);
  font-weight: 700;
  margin-left: 0.2rem;
}

.field input {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.7rem 0.85rem;
  font-size: 0.95rem;
  color: var(--text);
  background: var(--surface);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 20%, transparent);
}

.field.full {
  grid-column: 1 / -1;
}

.consent {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: start;
  margin: 0.35rem 0;
  font-size: 0.92rem;
  color: var(--text-muted);
}

.consent input {
  margin-top: 0.2rem;
}

.consent a {
  color: var(--brand);
  text-decoration: none;
  margin-left: 0.35rem;
  font-weight: 600;
}

.consent a:hover {
  color: var(--brand-2);
  text-decoration: underline;
}

button {
  border: none;
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  font-weight: 700;
  background: var(--brand);
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

button:hover {
  background: color-mix(in srgb, var(--brand) 82%, #000000);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

button:disabled {
  cursor: not-allowed;
  background: color-mix(in srgb, var(--text-muted) 75%, var(--surface) 25%);
  box-shadow: none;
  transform: none;
  color: color-mix(in srgb, var(--text) 65%, var(--surface) 35%);
}

.error {
  color: var(--danger);
  font-weight: 600;
  margin: 0;
}

[data-theme='dark'] .auth-form {
  background: color-mix(in srgb, var(--surface) 94%, #0b1220 6%);
}

[data-theme='dark'] .account-type .option {
  color: var(--text);
}

[data-theme='dark'] .field input {
  background: color-mix(in srgb, var(--surface-2) 80%, var(--surface) 20%);
  border-color: color-mix(in srgb, var(--border) 86%, #9fb5d8 14%);
}

[data-theme='dark'] .field input::placeholder {
  color: color-mix(in srgb, var(--text-muted) 86%, #c8d6eb 14%);
}

[data-theme='dark'] .consent {
  color: color-mix(in srgb, var(--text-muted) 88%, #d6e4f8 12%);
}

@media (max-width: 720px) {
  .auth-form {
    padding: 2rem 1.5rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
