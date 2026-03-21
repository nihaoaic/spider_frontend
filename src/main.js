import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './styles/element-override.css'
import router from './router/index.js'

// 全局 CSS 重置
const style = document.createElement('style')
style.innerHTML = `
  html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  #app { height: 100%; width: 100%; min-height: 100vh; }
`
document.head.appendChild(style)

const app = createApp(App)

app.use(ElementPlus)
app.use(router)

// 注册所有 Element Plus 图标
for (const [name, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(name, component)
}

app.mount('#app')
