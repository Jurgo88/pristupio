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
.auth-container { max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
input { display: block; width: 100%; margin-bottom: 10px; padding: 10px; }
button { width: 100%; padding: 10px; background: #42b883; color: white; border: none; cursor: pointer; }
.error { color: red; margin-top: 10px; }
</style>