import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { enforceLightTheme } from './theme/lightTheme'

import './assets/styles/main.css'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'

// The admin site is light-only; the OS/browser color scheme must have no effect.
enforceLightTheme()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
