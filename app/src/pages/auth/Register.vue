<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const email = ref('')
const password = ref('')

const handleRegister = async () => {
  try {
    await auth.signUp(email.value, password.value)
    if (!auth.authError) {
      alert('Registrácia prebehla, skontroluj si mail (alebo spam)!')
    }
  } catch (err) {
    // Chyba sa zobrazí v UI cez auth.authError
  }
}
</script>

<template>
  <div class="auth-form">
    <h2>Registrácia</h2>
    <input v-model="email" type="email" placeholder="Tvoj email" />
    <input v-model="password" type="password" placeholder="Heslo (min. 6 znakov)" />
    
    <button @click="handleRegister" :disabled="auth.loading">
      Vytvoriť účet
    </button>
    
    <p v-if="auth.authError" :class="{ 'info': !auth.loading }">
      {{ auth.authError }}
    </p>
  </div>
</template>