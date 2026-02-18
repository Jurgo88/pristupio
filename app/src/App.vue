<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useRoute, useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const topbarRef = ref<HTMLElement | null>(null)
const mobileMenuOpen = ref(false)
const isDark = ref(false)
const isTopbarScrolled = ref(false)
const isMobileTopbar = ref(false)
const THEME_KEY = 'pristupio-theme'

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

const applyTheme = (theme: 'light' | 'dark') => {
  document.documentElement.setAttribute('data-theme', theme)
  isDark.value = theme === 'dark'
}

const toggleTheme = () => {
  applyTheme(isDark.value ? 'light' : 'dark')
}

const TOPBAR_SCROLL_ON = 52
const TOPBAR_SCROLL_OFF = 20

const handleTopbarScroll = () => {
  const y = window.scrollY || 0
  if (!isTopbarScrolled.value && y > TOPBAR_SCROLL_ON) {
    isTopbarScrolled.value = true
    return
  }
  if (isTopbarScrolled.value && y < TOPBAR_SCROLL_OFF) {
    isTopbarScrolled.value = false
  }
}

const MOBILE_TOPBAR_BREAKPOINT = 980

const handleViewport = () => {
  isMobileTopbar.value = window.innerWidth <= MOBILE_TOPBAR_BREAKPOINT
  if (!isMobileTopbar.value) {
    closeMobileMenu()
  }
}

const handlePointerDown = (event: PointerEvent) => {
  if (!mobileMenuOpen.value) return
  const target = event.target as Node | null
  if (!target || !topbarRef.value) return
  if (!topbarRef.value.contains(target)) {
    closeMobileMenu()
  }
}

onMounted(() => {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') {
    applyTheme(stored)
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }
  handleTopbarScroll()
  handleViewport()
  window.addEventListener('scroll', handleTopbarScroll, { passive: true })
  window.addEventListener('resize', handleViewport, { passive: true })
  window.addEventListener('pointerdown', handlePointerDown, { passive: true })
})

watch(isDark, (dark) => {
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
})

watch(
  () => route.fullPath,
  () => {
    closeMobileMenu()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleTopbarScroll)
  window.removeEventListener('resize', handleViewport)
  window.removeEventListener('pointerdown', handlePointerDown)
})
</script>

<template>
  <div class="app-shell">
    <nav
      ref="topbarRef"
      class="navbar navbar-expand topbar px-3"
      :class="{ 'is-scrolled': isTopbarScrolled }"
    >
      <div class="container-fluid">
        <router-link to="/" class="navbar-brand brand">
          <span class="brand-mark">P</span>
          Pristupio
        </router-link>

        <div class="ms-auto d-flex align-items-center topbar-actions">
          <div class="topbar-theme">
            <button
              type="button"
              class="theme-switch"
              :class="{ 'is-dark': isDark }"
              role="switch"
              :aria-checked="isDark ? 'true' : 'false'"
              @click="toggleTheme"
              :aria-label="isDark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'"
            >
              <span class="theme-switch__text theme-switch__text--light">Light</span>
              <span class="theme-switch__text theme-switch__text--dark">Dark</span>
              <span class="theme-switch__thumb" :class="{ 'is-dark': isDark }">
                <span class="theme-switch__glyph" :class="isDark ? 'is-moon' : 'is-sun'"></span>
              </span>
            </button>
          </div>
          <div v-if="!auth.isLoggedIn" class="topbar-guest">
            <router-link
              v-if="!isMobileTopbar"
              to="/login"
              class="btn btn-sm topbar-btn topbar-btn--ghost topbar-guest-link"
            >
              Prihlásiť sa
            </router-link>
            <router-link
              v-if="!isMobileTopbar"
              to="/register"
              class="btn btn-sm topbar-btn topbar-btn--solid topbar-guest-link"
            >
              Registrácia
            </router-link>
            <button
              v-if="isMobileTopbar"
              class="btn btn-sm topbar-btn topbar-btn--ghost burger-btn guest-burger-btn"
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

          <div v-else class="d-flex align-items-center topbar-auth">
            <div class="account-chip">
              <span class="account-email">{{ auth.user?.email }}</span>
              <span v-if="auth.isAdmin" class="badge bg-danger ms-1">Admin</span>
              <span v-if="auth.isPaid && !auth.isAdmin" class="account-divider">•</span>
              <span v-if="auth.isPaid && !auth.isAdmin" class="account-credit">
                Kredity: {{ auth.paidAuditCredits ?? 0 }}
              </span>
            </div>

            <div v-if="!isMobileTopbar" class="topbar-links">
              <router-link to="/dashboard" class="btn btn-sm topbar-btn topbar-btn--ghost">
                Dashboard
              </router-link>

              <router-link
                v-if="auth.isAdmin"
                to="/admin"
                class="btn btn-sm topbar-btn topbar-btn--ghost"
              >
                Admin
              </router-link>
            </div>

            <button
              v-if="!isMobileTopbar"
              class="btn btn-sm topbar-btn topbar-btn--ghost logout-btn"
              @click="handleLogout"
              :disabled="auth.loading"
            >
              <span class="logout-icon" aria-hidden="true">⎋</span>
              <span class="logout-label">Odhlásiť sa</span>
            </button>

            <button
              v-if="isMobileTopbar"
              class="btn btn-sm topbar-btn topbar-btn--ghost burger-btn"
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
        id="mobile-menu"
        class="mobile-menu"
        :class="{ open: mobileMenuOpen }"
      >
        <template v-if="auth.isLoggedIn">
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
        </template>
        <template v-else>
          <router-link to="/login" class="mobile-link" @click="closeMobileMenu">
            Prihlásiť sa
          </router-link>
          <router-link to="/register" class="mobile-link" @click="closeMobileMenu">
            Registrácia
          </router-link>
        </template>
      </div>
    </nav>

    <main class="container-fluid mt-4 app-main">
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
          <span>© 2026 Pristupio. Všetky práva vyhradené · Created by <a href="https://jurgo.sk">Jurgo</a></span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0.35rem;
  z-index: 1030;
  width: min(1720px, calc(100% - 1.25rem));
  margin: 0 auto 1.35rem;
  height: 100px;
  padding: 0 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 11px;
  background:
    radial-gradient(380px 180px at 88% -30%, rgba(56, 189, 248, 0.33), transparent 66%),
    linear-gradient(120deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.92) 56%, rgba(14, 165, 233, 0.86) 100%);
  box-shadow:
    0 18px 36px rgba(15, 23, 42, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  overflow: visible;
  transition:
    height var(--motion-base) var(--ease-emphasized),
    box-shadow var(--motion-base) var(--ease-standard),
    backdrop-filter var(--motion-base) var(--ease-standard);
  will-change: height;
}

.topbar.is-scrolled {
  height: 90px;
  box-shadow:
    0 22px 40px rgba(15, 23, 42, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
}

.topbar::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

[data-theme='dark'] .topbar {
  border-color: rgba(71, 85, 105, 0.66);
  background:
    radial-gradient(420px 210px at 88% -30%, rgba(37, 99, 235, 0.36), transparent 65%),
    linear-gradient(120deg, rgba(2, 6, 23, 0.94) 0%, rgba(15, 23, 42, 0.92) 58%, rgba(30, 64, 175, 0.7) 100%);
  box-shadow:
    0 18px 36px rgba(2, 6, 23, 0.5),
    inset 0 1px 0 rgba(148, 163, 184, 0.11);
}

[data-theme='dark'] .topbar.is-scrolled {
  box-shadow:
    0 22px 40px rgba(2, 6, 23, 0.56),
    inset 0 1px 0 rgba(148, 163, 184, 0.1);
}

.brand {
  font-weight: 800;
  letter-spacing: 0.01em;
  font-size: 1.02rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.68rem;
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
  width: 36px;
  height: 36px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #67e8f9, #2563eb);
  color: #0f172a;
  font-weight: 900;
  box-shadow:
    0 12px 24px rgba(37, 99, 235, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transform: rotate(-8deg);
}

.topbar .topbar-btn,
.topbar .topbar-btn.btn-sm {
  border-radius: var(--radius-sm);
  font-weight: 700;
  height: 42px;
  min-height: 42px;
  padding: 0 0.92rem;
  font-size: 0.84rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  border-width: 1px;
  border-style: solid;
  letter-spacing: 0.01em;
  white-space: nowrap;
  transition:
    transform var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    background var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.topbar .topbar-btn--ghost {
  border-color: rgba(148, 163, 184, 0.42);
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.topbar .topbar-btn--ghost:hover {
  background: rgba(226, 232, 240, 0.16);
  border-color: rgba(226, 232, 240, 0.58);
  color: #f8fafc;
  transform: translateY(-1px);
}

.topbar .topbar-btn.router-link-active,
.topbar .topbar-btn.router-link-exact-active {
  border-color: rgba(125, 211, 252, 0.6);
  background: rgba(14, 165, 233, 0.2);
  color: #f8fafc;
}

.topbar .topbar-btn--solid {
  color: #f8fafc;
  border-color: rgba(147, 197, 253, 0.6);
  background: rgba(59, 130, 246, 0.44);
  box-shadow: inset 0 1px 0 rgba(219, 234, 254, 0.24);
}

.topbar .topbar-btn--solid:hover {
  background: rgba(59, 130, 246, 0.58);
  border-color: rgba(191, 219, 254, 0.74);
  transform: translateY(-1px);
}

.topbar-links .topbar-btn {
  min-width: 108px;
}

.logout-btn {
  min-width: 122px;
  padding-inline: 0.95rem;
}

.topbar .logout-btn {
  display: inline-flex;
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.42);
  background: rgba(15, 23, 42, 0.24);
}

.topbar .logout-btn:hover {
  background: rgba(226, 232, 240, 0.16);
  border-color: rgba(226, 232, 240, 0.58);
  color: #f8fafc;
  transform: translateY(-1px);
}

.topbar-actions {
  gap: 0.82rem;
  align-items: center;
}

.topbar-theme {
  display: flex;
  align-items: center;
}

.theme-switch {
  position: relative;
  width: 136px;
  height: 44px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: var(--radius-pill);
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  padding: 0;
  overflow: hidden;
}

.theme-switch:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.35);
}

.theme-switch__text {
  z-index: 2;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.64rem;
  font-weight: 800;
  color: #96aac7;
  transition: color var(--motion-fast) var(--ease-standard), opacity var(--motion-fast) var(--ease-standard);
}

.theme-switch__text--light {
  color: #f8fafc;
}

.theme-switch.is-dark .theme-switch__text--light {
  color: #96aac7;
  opacity: 0.92;
}

.theme-switch.is-dark .theme-switch__text--dark {
  color: #f8fafc;
  opacity: 0;
}

.theme-switch:not(.is-dark) .theme-switch__text--light {
  opacity: 0;
}

.theme-switch:not(.is-dark) .theme-switch__text--dark {
  opacity: 0.92;
}

.theme-switch__thumb {
  position: absolute;
  left: 3px;
  top: 4px;
  width: 64px;
  height: 36px;
  border-radius: var(--radius-pill);
  background: linear-gradient(145deg, #f8fafc, #bae6fd);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
  display: grid;
  place-items: center;
  transition:
    transform var(--motion-fast) var(--ease-standard),
    background var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);
  z-index: 1;
}

.theme-switch__thumb.is-dark {
  transform: translateX(66px);
  background: linear-gradient(145deg, #0f172a, #1e293b);
}

.theme-switch__glyph {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  position: relative;
}

.theme-switch__glyph.is-sun {
  background: radial-gradient(circle at 35% 35%, #fde68a, #f59e0b 72%);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.16);
}

.theme-switch__glyph.is-moon {
  background: #e2e8f0;
}

.theme-switch__glyph.is-moon::after {
  content: '';
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #1e293b;
  top: 1px;
  left: 4px;
}

[data-theme='dark'] .theme-switch {
  border-color: rgba(71, 85, 105, 0.88);
  background: rgba(2, 6, 23, 0.52);
}

[data-theme='dark'] .theme-switch__text {
  color: #87a0c1;
}

[data-theme='dark'] .topbar .topbar-btn--ghost {
  border-color: rgba(71, 85, 105, 0.82);
  background: rgba(2, 6, 23, 0.32);
  color: #dbe7fb;
}

[data-theme='dark'] .topbar .topbar-btn--ghost:hover {
  border-color: rgba(125, 211, 252, 0.5);
  background: rgba(15, 23, 42, 0.52);
}

[data-theme='dark'] .topbar .topbar-btn.router-link-active,
[data-theme='dark'] .topbar .topbar-btn.router-link-exact-active {
  border-color: rgba(125, 211, 252, 0.65);
  background: rgba(14, 165, 233, 0.24);
  color: #f8fafc;
}

[data-theme='dark'] .topbar .topbar-btn--solid {
  border-color: rgba(147, 197, 253, 0.6);
  background: rgba(59, 130, 246, 0.45);
  color: #f8fafc;
}

[data-theme='dark'] .topbar .topbar-btn--solid:hover {
  border-color: rgba(186, 230, 253, 0.74);
  background: rgba(59, 130, 246, 0.6);
}

[data-theme='dark'] .topbar .logout-btn {
  border-color: rgba(71, 85, 105, 0.82);
  background: rgba(2, 6, 23, 0.32);
  color: #dbe7fb;
}

[data-theme='dark'] .topbar .logout-btn:hover {
  border-color: rgba(125, 211, 252, 0.5);
  background: rgba(15, 23, 42, 0.52);
  color: #f8fafc;
}

[data-theme='dark'] .theme-switch__thumb {
  box-shadow: 0 8px 18px rgba(2, 6, 23, 0.44);
}

.topbar-guest {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.guest-burger-btn {
  display: none;
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

.topbar .burger-btn {
  display: none;
}

@media (min-width: 641px) {
  .topbar .burger-btn {
    display: none !important;
  }
}

.burger-line {
  width: 18px;
  height: 2px;
  background: #e2e8f0;
  border-radius: 999px;
  display: block;
  transition: transform var(--motion-fast) var(--ease-standard), opacity var(--motion-fast) var(--ease-standard);
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
  margin-bottom: 1.1rem;
  padding: 0;
}

.navbar .container-fluid {
  align-items: center;
  gap: 0.72rem;
  padding-left: 0.08rem;
  padding-right: 0.08rem;
  height: 100%;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-shell main {
  flex: 1 0 auto;
}

.app-main {
  width: 100%;
  max-width: 1720px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
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

[data-theme='dark'] .site-footer {
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.86) 0%, rgba(2, 6, 23, 0.95) 100%),
    radial-gradient(520px 180px at 50% 0%, rgba(56, 189, 248, 0.12), transparent 72%);
  border-top: 1px solid rgba(56, 189, 248, 0.28);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.12), 0 -14px 30px rgba(2, 6, 23, 0.45);
}

[data-theme='dark'] .footer-brand p,
[data-theme='dark'] .footer-col a,
[data-theme='dark'] .footer-col span {
  color: #dbe7fb;
}

[data-theme='dark'] .footer-bottom {
  color: #c4d4ef;
}

@media (max-width: 980px) {
  .topbar {
    width: calc(100% - 0.9rem);
    height: 92px;
    padding: 0 0.72rem;
  }

  .topbar.is-scrolled {
    height: 84px;
  }

  .topbar-actions {
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: 0.66rem;
  }

  .navbar .container-fluid {
    flex-wrap: nowrap;
    justify-content: space-between;
  }

  .topbar-guest {
    width: auto;
    margin-left: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.4rem;
  }

  .topbar-guest .topbar-btn {
    display: none;
  }

  .topbar-guest .guest-burger-btn {
    display: inline-flex !important;
    margin-left: 0;
  }

  .topbar-auth {
    width: auto;
    justify-content: flex-end;
    align-items: center;
    gap: 0.4rem;
  }

  .topbar-auth .topbar-btn {
    display: none;
  }

  .topbar-auth .burger-btn {
    display: inline-flex !important;
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
    transition:
      max-height var(--motion-base) var(--ease-standard),
      opacity var(--motion-fast) var(--ease-standard),
      transform var(--motion-fast) var(--ease-standard),
      padding var(--motion-fast) var(--ease-standard),
      border-color var(--motion-fast) var(--ease-standard);
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

  .mobile-link.router-link-active,
  .mobile-link.router-link-exact-active {
    border-color: rgba(125, 211, 252, 0.58);
    background: rgba(14, 165, 233, 0.22);
    color: #f8fafc;
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
  .app-main {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .topbar {
    top: 0.25rem;
    width: calc(100% - 0.7rem);
    height: 84px;
    padding: 0 0.64rem;
    border-radius: 10px;
  }

  .topbar.is-scrolled {
    height: 76px;
  }

  .navbar .container-fluid {
    flex-wrap: nowrap;
    gap: 0.5rem;
    justify-content: space-between;
  }

  .topbar-actions {
    width: auto;
    margin-left: auto;
    justify-content: flex-end;
    flex-wrap: nowrap;
    gap: 0.54rem;
  }

  .brand {
    font-size: 0.95rem;
    gap: 0.52rem;
  }

  .brand-mark {
    width: 32px;
    height: 32px;
    border-radius: 11px;
  }

  .theme-switch {
    width: 114px;
    height: 38px;
    padding: 0;
  }

  .theme-switch__text {
    font-size: 0.58rem;
  }

  .theme-switch__thumb {
    width: 52px;
    height: 30px;
    top: 3px;
  }

  .theme-switch__thumb.is-dark {
    transform: translateX(56px);
  }

  .topbar-guest {
    width: auto;
    margin-left: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.4rem;
  }

  .topbar-guest .topbar-btn {
    display: none;
  }

  .topbar-guest .guest-burger-btn {
    display: inline-flex !important;
    margin-left: 0;
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

  .topbar-auth .topbar-btn {
    display: none;
  }

  .topbar-auth .burger-btn {
    display: inline-flex !important;
    align-self: center;
    margin-left: auto;
  }

}

@media (max-width: 460px) {
  .topbar-guest {
    width: auto;
  }
}
</style>

