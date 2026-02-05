<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const consentMarketing = ref(false)

const handleRegister = async () => {
  try {
    await auth.signUp(email.value, password.value, consentMarketing.value)
    if (!auth.authError) {
      alert('Registracia prebehla, skontroluj si mail (alebo spam).')
    }
  } catch (_err) {
    // Error is displayed via auth.authError
  }
}
</script>

<template>
  <div class="auth-form">
    <h2>Registracia</h2>
    <input v-model="email" type="email" placeholder="Tvoj email" />
    <input v-model="password" type="password" placeholder="Heslo (min. 6 znakov)" />

    <label class="consent">
      <input v-model="consentMarketing" type="checkbox" />
      <span>
        Suhlasim s kontaktovanim ohladom ponuky a doplnujucich sluzieb.
      </span>
    </label>

    <button @click="handleRegister" :disabled="auth.loading">
      Vytvorit ucet
    </button>

    <p v-if="auth.authError" :class="{ info: !auth.loading }">
      {{ auth.authError }}
    </p>
  </div>
</template>

<style scoped>
.consent {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.6rem;
  align-items: start;
  margin: 0.7rem 0 0.9rem;
  font-size: 0.9rem;
  color: #475569;
}

.consent input {
  margin-top: 0.2rem;
}
</style>
