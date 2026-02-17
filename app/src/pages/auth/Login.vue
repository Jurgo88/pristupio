<template>
  <div class="auth-container">
    <h1>Prihlásenie</h1>
    <form @submit.prevent="handleLogin">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Heslo" required />
      <button :disabled="auth.loading">
        {{ auth.loading ? 'Pracujem...' : 'Vstúpiť' }}
      </button>
    </form>
    <p v-if="auth.authError" class="error">{{ auth.authError }}</p>
    <router-link to="/register">Ešte nemáš účet? Registruj sa</router-link>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')

const handleLogin = async () => {
  try {
    await auth.signIn(email.value, password.value)
    router.push('/')
  } catch (e) {
    // Chyba je v auth.authError
  }
}
</script>

<style scoped>
.auth-container {
  max-width: 430px;
  margin: 3rem auto;
  padding: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

h1 {
  margin: 0 0 1.1rem;
  color: var(--text);
  font-size: 1.7rem;
}

form {
  display: grid;
  gap: 0.85rem;
}

input {
  display: block;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  background: var(--surface);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 20%, transparent);
}

button {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--radius-md);
  background: var(--brand);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--brand) 82%, #000000);
  box-shadow: var(--shadow-sm);
}

button:disabled {
  cursor: not-allowed;
  background: color-mix(in srgb, var(--text-muted) 75%, var(--surface) 25%);
  color: color-mix(in srgb, var(--text) 65%, var(--surface) 35%);
  transform: none;
  box-shadow: none;
}

.error {
  color: var(--danger);
  margin: 0.35rem 0 0;
  font-weight: 600;
}

.auth-container > a {
  display: inline-block;
  margin-top: 1rem;
  color: var(--brand);
  font-weight: 600;
}

.auth-container > a:hover {
  color: var(--brand-2);
}

[data-theme='dark'] .auth-container {
  background: color-mix(in srgb, var(--surface) 94%, #0b1220 6%);
}

[data-theme='dark'] input {
  background: color-mix(in srgb, var(--surface-2) 80%, var(--surface) 20%);
  border-color: color-mix(in srgb, var(--border) 86%, #9fb5d8 14%);
}

[data-theme='dark'] input::placeholder {
  color: color-mix(in srgb, var(--text-muted) 86%, #c8d6eb 14%);
}
</style>
