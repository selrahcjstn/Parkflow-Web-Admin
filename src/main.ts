import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import './assets/styles/main.css'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'

// Ensure dark mode is disabled and removed
document.documentElement.classList.remove('dark')

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
