import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth.store'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import './styles/index.css'

async function bootstrap() {
    const app = createApp(App)

    const pinia = createPinia()
    app.use(pinia)
    app.use(router)

    // 1. Získame store s injektnutou piniou
    const authStore = useAuthStore(pinia)

    // 2. Zavoláme init() a počkáme (await), kým Supabase odpovie
    // Toto prepne loadingSession na false
    try {
        await authStore.init()
    } catch (error) {
        if ((error as any)?.name !== 'AbortError') {
            console.error('Auth initialization failed', error)
        }
    }

    // 3. Až keď vieme, či je user prihlásený, namontujeme appku
    app.mount('#app')
}

bootstrap()
