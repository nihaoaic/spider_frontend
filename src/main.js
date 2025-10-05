import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/element-override.css'

// 添加全局CSS重置
const style = document.createElement('style')
style.innerHTML = `
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  #app {
    height: 100%;
    width: 100%;
    min-height: 100vh;
  }
`
document.head.appendChild(style)

const app = createApp(App)

app.use(ElementPlus)

app.mount('#app')
