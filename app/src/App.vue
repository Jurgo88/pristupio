<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store' // Skontroluj si cestu k súboru .store
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await auth.signOut() // Voláme funkciu zo store
  router.push('/login') // Po odhlásení hodíme používateľa na login
}
</script>

<template>
  <nav class="navbar navbar-expand navbar-dark bg-dark px-3">
    <router-link to="/" class="navbar-brand">Prístupio</router-link>

    <div class="ms-auto d-flex align-items-center">
      <div v-if="!auth.isLoggedIn">
        <router-link to="/login" class="btn btn-sm btn-outline-light me-2">
          Prihlásiť sa
        </router-link>
        <router-link to="/register" class="btn btn-sm btn-light">
          Registrácia
        </router-link>
      </div>

      <div v-else class="d-flex align-items-center">
        <span class="text-light me-3 small">
          {{ auth.user?.email }} 
          <span v-if="auth.isAdmin" class="badge bg-danger ms-1">Admin</span>
        </span>
        
        <button 
          class="btn btn-sm btn-outline-danger" 
          @click="handleLogout"
          :disabled="auth.loading"
        >
          Odhlásiť sa
        </button>
      </div>
    </div>
  </nav>

  <main class="container mt-4">
    <div v-if="auth.loadingSession" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Načítavam prístup...</p>
    </div>
    
    <router-view v-else />
  </main>
</template>

<style scoped>
.navbar {
  margin-bottom: 2rem;
}
</style>