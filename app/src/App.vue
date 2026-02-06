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
  <div class="app-shell">
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

            <router-link
              v-if="auth.isAdmin"
              to="/admin"
              class="btn btn-sm btn-outline-light me-2"
            >
              Admin
            </router-link>

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

    <footer class="site-footer">
      <div class="container">
        <div class="footer-inner">
          <div class="footer-brand">
            <strong>Pristupio</strong>
            <p>WCAG audit a monitoring, ktorý dáva zrozumiteľný výstup pre celý tím.</p>
          </div>
          <div class="footer-links">
            <div class="footer-col">
              <p class="footer-title">Rýchle odkazy</p>
              <a href="#features">Čo získate</a>
              <a href="#how">Ako to funguje</a>
              <a href="#pricing">Cenník</a>
              <a href="#about">O nás</a>
            </div>
            <div class="footer-col">
              <p class="footer-title">Legislatíva</p>
              <span>WCAG 2.1 AA</span>
              <span>EN 301 549</span>
              <span>EAA 2019/882</span>
              <span>WAD 2016/2102</span>
            </div>
            <div class="footer-col">
              <p class="footer-title">Právne</p>
              <router-link to="/terms">Podmienky používania</router-link>
              <router-link to="/privacy">Ochrana súkromia</router-link>
              <router-link to="/refunds">Refundácie</router-link>
            </div>
            <div class="footer-col">
              <p class="footer-title">Kontakt</p>
              <span>support@pristupio.sk</span>
              <span>AJRONIK s.r.o.</span>
              <span>IČO: 55304052</span>
              <span>DIČ: 2121943153</span>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Pristupio. Všetky práva vyhradené · Created By <a href="https://jurgo.sk">Jurgo</a></span>
        </div>
      </div>
    </footer>
  </div>
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

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-shell main {
  flex: 1 0 auto;
}

.site-footer {
  margin: 0;
  padding: 2.2rem 0 1.2rem;
  background: #0f172a;
  color: #cbd5f5;
  border-top: none;
  margin-top: auto;
}

.footer-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

.footer-brand strong {
  color: #f8fafc;
  font-size: 1.1rem;
}

.footer-brand p {
  margin: 0.6rem 0 0;
  color: #94a3b8;
  max-width: 28rem;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.5rem;
}

.footer-col {
  display: grid;
  gap: 0.4rem;
}

.footer-title {
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 0.3rem;
}

.footer-col a,
.footer-col span {
  color: #cbd5f5;
  text-decoration: none;
  font-size: 0.95rem;
}

.footer-col a:hover {
  color: #38bdf8;
}

.footer-bottom {
  margin-top: 0;
  padding: 0.8rem 0 0;
  border-top: none;
  font-size: 0.85rem;
  color: #94a3b8;
  text-align: center;
}

.footer-bottom a {
  color: #cbd5f5;
  text-decoration: none;
}

.footer-bottom a:hover {
  color: #38bdf8;
}

@media (max-width: 980px) {
  .footer-inner {
    grid-template-columns: 1fr;
  }

  .footer-links {
    grid-template-columns: 1fr;
  }
}
</style>
