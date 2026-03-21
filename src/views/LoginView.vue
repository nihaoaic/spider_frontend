<template>
  <div class="login-wrap">
    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <div class="logo-icon">🕷</div>
        <h1 class="login-title">Spider Server</h1>
        <p class="login-subtitle">爬虫调度管理平台</p>
      </div>

      <!-- 首次使用提示 -->
      <el-alert
        v-if="isFirstRun"
        title="首次使用 — 请创建管理员账号"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 开发模式提示 -->
      <el-alert
        v-if="devMode"
        title="开发模式：JWT 未启用，无需登录"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- Tab：登录 / 注册 -->
      <el-tabs v-model="activeTab" class="login-tabs" v-if="!devMode">
        <el-tab-pane label="登录" name="login">
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            label-position="top"
            @submit.prevent="doLogin"
          >
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                prefix-icon="User"
                size="large"
                clearable
              />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="doLogin"
              />
            </el-form-item>

            <el-button
              type="primary"
              size="large"
              style="width: 100%; margin-top: 8px"
              :loading="loading"
              @click="doLogin"
            >
              登录
            </el-button>
          </el-form>
        </el-tab-pane>

        <el-tab-pane :label="isFirstRun ? '创建管理员' : '注册用户'" name="register">
          <el-form
            ref="regFormRef"
            :model="regForm"
            :rules="regRules"
            label-position="top"
            @submit.prevent="doRegister"
          >
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="regForm.username"
                placeholder="请输入用户名"
                prefix-icon="User"
                size="large"
                clearable
              />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="regForm.password"
                type="password"
                placeholder="密码至少 6 位"
                prefix-icon="Lock"
                size="large"
                show-password
              />
            </el-form-item>

            <el-form-item label="确认密码" prop="password2">
              <el-input
                v-model="regForm.password2"
                type="password"
                placeholder="再次输入密码"
                prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="doRegister"
              />
            </el-form-item>

            <!-- 非首次注册需要 admin key -->
            <el-form-item v-if="!isFirstRun" label="管理员 Key" prop="adminKey">
              <el-input
                v-model="regForm.adminKey"
                type="password"
                placeholder="ADMIN_API_KEY"
                prefix-icon="Key"
                size="large"
                show-password
              />
            </el-form-item>

            <el-button
              type="success"
              size="large"
              style="width: 100%; margin-top: 8px"
              :loading="loading"
              @click="doRegister"
            >
              {{ isFirstRun ? '创建管理员账号' : '注册' }}
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <!-- 开发模式下的跳过按钮 -->
      <el-button
        v-if="devMode"
        type="primary"
        size="large"
        style="width: 100%"
        @click="skipLogin"
      >
        进入系统（开发模式）
      </el-button>

      <div class="login-footer">Spider Server · 爬虫管理平台</div>
    </div>
  </div>
</template>

<script>
import { ElMessage } from 'element-plus'
import { setToken, setUser } from '../utils/auth.js'

const API = () => import.meta.env.VITE_API || ''

export default {
  name: 'LoginView',
  data() {
    const validatePass2 = (_rule, value, callback) => {
      if (value !== this.regForm.password) {
        callback(new Error('两次输入密码不一致'))
      } else {
        callback()
      }
    }
    return {
      activeTab: 'login',
      devMode: false,
      isFirstRun: false,
      loading: false,
      loginForm: { username: '', password: '' },
      regForm: { username: '', password: '', password2: '', adminKey: '' },
      loginRules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
      },
      regRules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码至少 6 位', trigger: 'blur' },
        ],
        password2: [
          { required: true, message: '请确认密码', trigger: 'blur' },
          { validator: validatePass2, trigger: 'blur' },
        ],
      },
    }
  },
  async mounted() {
    await this.checkStatus()
  },
  methods: {
    async checkStatus() {
      try {
        const base = API()
        const res = await fetch(`${base}/auth/status`)
        const data = await res.json()
        if (!data.jwt_enabled) {
          this.devMode = true
          return
        }
        if (data.first_run) {
          this.isFirstRun = true
          this.activeTab = 'register'
        }
      } catch (e) {
        console.warn('无法获取后端状态:', e)
      }
    },

    async doLogin() {
      await this.$refs.loginFormRef.validate()
      this.loading = true
      try {
        const base = API()
        const res = await fetch(`${base}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.loginForm.username,
            password: this.loginForm.password,
          }),
        })
        const data = await res.json()
        if (data.status === 'success') {
          setToken(data.token)
          setUser(data.user)
          ElMessage.success(`欢迎回来，${data.user.username}！`)
          this.$router.push('/')
        } else {
          ElMessage.error(data.message || '登录失败')
        }
      } catch (e) {
        ElMessage.error('网络错误：' + e.message)
      } finally {
        this.loading = false
      }
    },

    async doRegister() {
      await this.$refs.regFormRef.validate()
      this.loading = true
      try {
        const base = API()
        const body = {
          username: this.regForm.username,
          password: this.regForm.password,
        }
        if (this.regForm.adminKey) body.admin_api_key = this.regForm.adminKey

        const res = await fetch(`${base}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (data.status === 'success') {
          ElMessage.success('注册成功，请登录')
          this.activeTab = 'login'
          this.isFirstRun = false
          this.loginForm.username = this.regForm.username
        } else {
          ElMessage.error(data.message || '注册失败')
        }
      } catch (e) {
        ElMessage.error('网络错误：' + e.message)
      } finally {
        this.loading = false
      }
    },

    skipLogin() {
      setToken('dev-no-auth')
      setUser({ username: 'dev', role: 'admin' })
      this.$router.push('/')
    },
  },
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a2a3a 0%, #2d3a4b 50%, #1a2a3a 100%);
}

.login-card {
  width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 40px 40px 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.login-logo {
  text-align: center;
  margin-bottom: 28px;
}

.logo-icon {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 8px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #2d3a4b;
  margin: 0 0 4px;
}

.login-subtitle {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: #c0c4cc;
}
</style>
