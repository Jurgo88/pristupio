<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
</script>

<template>
  <nav class="navbar navbar-dark bg-dark px-3">
    <span class="navbar-brand">Prístupio</span>

    <button
      v-if="!auth.isLoggedIn"
      class="btn btn-sm btn-outline-light"
      @click="auth.loginMock()"
    >
      Mock login
    </button>

    <button
      v-else
      class="btn btn-sm btn-outline-light"
      @click="auth.logout()"
    >
      Logout
    </button>
  </nav>

  <main class="container mt-4">
    <router-view />
  </main>
</template>
