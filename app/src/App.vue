<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <nav class="navbar navbar-expand topbar px-3">
    <div class="container-fluid">
      <router-link to="/" class="navbar-brand brand">
        <span class="brand-mark">P</span>
        Pristupio
      </router-link>

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
          <span class="text-light me-3 small user-pill">
            {{ auth.user?.email }}
            <span v-if="auth.isAdmin" class="badge bg-danger ms-1">Admin</span>
          </span>

          <button
            class="btn btn-sm btn-outline-warning"
            @click="handleLogout"
            :disabled="auth.loading"
          >
            Odhlásiť sa
          </button>
        </div>
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
.topbar {
  background: linear-gradient(120deg, #0f172a 0%, #1e3a8a 45%, #0ea5e9 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.25);
  position: sticky;
  top: 0;
  z-index: 1030;
  backdrop-filter: blur(8px);
}

.brand {
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.brand,
.brand:hover,
.brand:focus,
.brand:active,
.brand:visited {
  color: #f8fafc;
  text-decoration: none;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #38bdf8, #2563eb);
  color: #0f172a;
  font-weight: 800;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.35);
}

.topbar .btn {
  border-radius: var(--radius);
  font-weight: 600;
  padding: 0.35rem 0.95rem;
}

.topbar .btn-outline-light {
  border-color: rgba(226, 232, 240, 0.6);
  color: #e2e8f0;
}

.topbar .btn-outline-light:hover {
  background: rgba(226, 232, 240, 0.2);
  color: #f8fafc;
}

.topbar .btn-light {
  color: #0f172a;
  background: #f8fafc;
  border: none;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2);
}

.topbar .btn-outline-warning {
  border-color: rgba(251, 191, 36, 0.7);
  color: #fef3c7;
}

.user-pill {
  background: rgba(15, 23, 42, 0.35);
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.navbar {
  margin-bottom: 2rem;
}
</style>
