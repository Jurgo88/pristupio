<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const mobileMenuOpen = ref(false)

const handleLogout = async () => {
  await auth.signOut()
  router.push('/login')
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
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

        <div class="ms-auto d-flex align-items-center topbar-actions">
          <div v-if="!auth.isLoggedIn" class="topbar-guest">
            <router-link to="/login" class="btn btn-sm btn-outline-light">
              Prihlásiť sa
            </router-link>
            <router-link to="/register" class="btn btn-sm btn-light">
              Registrácia
            </router-link>
          </div>

          <div v-else class="d-flex align-items-center topbar-auth">
            <div class="account-chip">
              <span class="account-email">{{ auth.user?.email }}</span>
              <span v-if="auth.isAdmin" class="badge bg-danger ms-1">Admin</span>
              <span v-if="auth.isPaid && !auth.isAdmin" class="account-divider">•</span>
              <span v-if="auth.isPaid && !auth.isAdmin" class="account-credit">
                Kredity: {{ auth.paidAuditCredits ?? 0 }}
              </span>
            </div>

            <div class="topbar-links">
              <router-link to="/dashboard" class="btn btn-sm btn-outline-light">
                Dashboard
              </router-link>

              <router-link
                v-if="auth.isAdmin"
                to="/admin"
                class="btn btn-sm btn-outline-light"
              >
                Admin
              </router-link>
            </div>

            <button
              class="btn btn-sm btn-outline-warning logout-btn"
              @click="handleLogout"
              :disabled="auth.loading"
            >
              <span class="logout-icon" aria-hidden="true">⎋</span>
              <span class="logout-label">Odhlásiť sa</span>
            </button>

            <button
              class="btn btn-sm btn-outline-light burger-btn"
              @click="toggleMobileMenu"
              :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
              :class="{ open: mobileMenuOpen }"
              aria-label="Otvoriť menu"
              aria-controls="mobile-menu"
            >
              <span class="burger-line"></span>
              <span class="burger-line"></span>
              <span class="burger-line"></span>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="auth.isLoggedIn"
        id="mobile-menu"
        class="mobile-menu"
        :class="{ open: mobileMenuOpen }"
      >
        <div class="mobile-account">
          <div class="mobile-email">{{ auth.user?.email }}</div>
          <div class="mobile-meta">
            <span v-if="auth.isAdmin" class="badge bg-danger">Admin</span>
            <span v-if="auth.isPaid && !auth.isAdmin" class="mobile-credit">
              Kredity: {{ auth.paidAuditCredits ?? 0 }}
            </span>
          </div>
        </div>
        <router-link to="/dashboard" class="mobile-link" @click="closeMobileMenu">
          Dashboard
        </router-link>
        <router-link
          v-if="auth.isAdmin"
          to="/admin"
          class="mobile-link"
          @click="closeMobileMenu"
        >
          Admin
        </router-link>
        <button
          class="mobile-link is-logout"
          @click="closeMobileMenu(); handleLogout()"
          :disabled="auth.loading"
        >
          Odhlásiť sa
        </button>
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
              <router-link :to="{ path: '/', hash: '#features' }">Čo získate</router-link>
              <router-link :to="{ path: '/', hash: '#how' }">Ako to funguje</router-link>
              <router-link :to="{ path: '/', hash: '#pricing' }">Cenník</router-link>
              <router-link :to="{ path: '/', hash: '#about' }">O nás</router-link>
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
  padding: 0.65rem 0;
  overflow: visible;
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
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease,
    border-color 0.2s ease;
}

.topbar .btn-outline-light {
  border-color: rgba(226, 232, 240, 0.6);
  color: #e2e8f0;
}

.topbar .btn-outline-light:hover {
  background: rgba(226, 232, 240, 0.2);
  color: #f8fafc;
  transform: translateY(-1px);
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

.topbar-actions {
  gap: 0.8rem;
  align-items: center;
}

.topbar-guest {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.topbar-auth {
  gap: 0.9rem;
  flex-wrap: wrap;
}

.account-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius);
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.35);
  color: #e2e8f0;
  font-size: 0.85rem;
  margin-right: 0.6rem;
  flex-wrap: wrap;
}

.account-email {
  color: #f8fafc;
  font-weight: 600;
}

.account-divider {
  opacity: 0.6;
}

.account-credit {
  color: #bae6fd;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-size: 0.75rem;
  white-space: nowrap;
}

.topbar-links {
  display: flex;
  gap: 0.6rem;
  margin-right: 0.6rem;
}

.burger-btn {
  display: none;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.35rem 0.6rem;
  border-color: rgba(226, 232, 240, 0.6);
}

.burger-line {
  width: 18px;
  height: 2px;
  background: #e2e8f0;
  border-radius: 999px;
  display: block;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.mobile-menu {
  display: none;
}

.logout-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.35rem;
  font-size: 1rem;
  line-height: 1;
}

.navbar {
  margin-bottom: 2rem;
}

.navbar .container-fluid {
  align-items: center;
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
  .topbar-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .account-chip {
    margin-right: 0;
  }

  .topbar-links {
    margin-right: 0;
  }

  .footer-inner {
    grid-template-columns: 1fr;
  }

  .footer-links {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .topbar {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .navbar .container-fluid {
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .topbar-actions {
    width: auto;
    margin-left: auto;
    justify-content: flex-end;
  }

  .topbar-guest {
    width: 100%;
    margin-left: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .topbar-guest .btn {
    width: 100%;
    justify-content: center;
  }

  .topbar-auth {
    width: auto;
    justify-content: flex-end;
    align-items: center;
    gap: 0.4rem;
  }

  .account-chip {
    display: none;
  }

  .account-email {
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-credit {
    display: none;
  }

  .topbar-links {
    display: none;
  }

  .logout-btn {
    display: none;
  }

  .burger-btn {
    display: inline-flex;
    align-self: center;
    margin-left: auto;
  }

  .mobile-menu {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0 0;
    border-top: 1px solid transparent;
    background: rgba(15, 23, 42, 0.92);
    backdrop-filter: blur(10px);
    max-height: 0;
    opacity: 0;
    transform: translateY(-6px);
    overflow: hidden;
    pointer-events: none;
    transition: max-height 0.25s ease, opacity 0.2s ease, transform 0.2s ease,
      padding 0.2s ease, border-color 0.2s ease;
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    z-index: 1040;
  }

  .mobile-menu.open {
    display: flex;
    max-height: 420px;
    opacity: 1;
    transform: translateY(0);
    padding: 0.8rem 0.9rem 1rem;
    border-top-color: rgba(148, 163, 184, 0.2);
    pointer-events: auto;
    box-shadow: 0 20px 30px rgba(15, 23, 42, 0.35);
  }

  .burger-btn.open .burger-line:nth-child(1) {
    transform: translateY(4px) rotate(45deg);
  }

  .burger-btn.open .burger-line:nth-child(2) {
    opacity: 0;
  }

  .burger-btn.open .burger-line:nth-child(3) {
    transform: translateY(-4px) rotate(-45deg);
  }

  .mobile-account {
    padding: 0.65rem 0.8rem;
    border-radius: var(--radius);
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: rgba(15, 23, 42, 0.5);
  }

  .mobile-email {
    color: #f8fafc;
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mobile-meta {
    margin-top: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #bae6fd;
  }

  .mobile-credit {
    color: #bae6fd;
  }

  .mobile-link {
    display: block;
    padding: 0.65rem 0.9rem;
    border-radius: var(--radius);
    border: 1px solid rgba(226, 232, 240, 0.2);
    color: #e2e8f0;
    background: rgba(15, 23, 42, 0.4);
    text-decoration: none;
    text-align: left;
    font-weight: 600;
  }

  .mobile-link.is-logout {
    background: rgba(251, 191, 36, 0.08);
    border-color: rgba(251, 191, 36, 0.35);
    color: #fef3c7;
  }

  .logout-label {
    display: none;
  }

  .logout-icon {
    margin-right: 0;
  }
}

@media (max-width: 460px) {
  .topbar-guest {
    grid-template-columns: 1fr;
  }
}
</style>
