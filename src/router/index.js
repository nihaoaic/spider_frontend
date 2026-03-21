import { createRouter, createWebHashHistory } from 'vue-router'
import { isLoggedIn } from '../utils/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    // 先查询后端，若 JWT 未启用则直接放行
    try {
      const res = await fetch('/auth/status')
      const data = await res.json()
      if (!data.jwt_enabled) {
        return next()
      }
    } catch {
      // 无法连接后端时也放行，避免阻塞使用
      return next()
    }
    return next('/login')
  }
  if (to.path === '/login' && isLoggedIn()) {
    return next('/')
  }
  next()
})

export default router
