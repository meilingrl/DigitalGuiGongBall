import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { useAppStore } from './stores/app'
import { installThemeDomSync } from './theme/syncThemeDom'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const store = useAppStore()
store.initTheme()
installThemeDomSync()

app.use(router)
app.mount('#app')
