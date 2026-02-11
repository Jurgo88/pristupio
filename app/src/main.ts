import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth.store'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import './styles/index.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

const authStore = useAuthStore(pinia)

void authStore.init().catch((error) => {
  if ((error as any)?.name !== 'AbortError') {
    console.error('Auth initialization failed', error)
  }
})
