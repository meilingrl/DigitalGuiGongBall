import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { usePreferencesStore } from './stores/preferences'
import { installThemeDomSync } from './theme/syncThemeDom'
import './style.css'
import './studio.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const store = usePreferencesStore()
store.initTheme()
installThemeDomSync()

app.use(router)
app.mount('#app')
