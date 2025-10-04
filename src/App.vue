<template>
  <el-container style="height:100vh;">
    <el-aside width="220px" style="background:#2d3a4b; color:#fff; padding: 12px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:18px">
        <div style="width:36px; height:36px; background:#409EFF; border-radius:6px"></div>
        <div style="font-size:18px; font-weight:600">数据管理</div>
      </div>
      <el-menu default-active="redis" class="el-menu-vertical-demo" @select="onSelect" :background-color="'#2d3a4b'" :text-color="'#fff'" :active-text-color="'#ffd04b'">
        <el-menu-item index="redis">Redis 推送</el-menu-item>
        <el-menu-item index="mongo">Mongo 脚本</el-menu-item>
        <!-- 新增文件菜单项 -->
        <el-menu-item index="files">文件</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header style="background:#f5f7fa; padding:12px 20px; display:flex; align-items:center; justify-content:space-between;">
        <div style="font-size:16px">{{ currentTitle }}</div>
        <div style="display:flex; align-items:center; gap:12px">
          <div v-if="hosts.length" style="display:flex; align-items:center; gap:8px">
            <span style="color:#7f8c8d">Hosts:</span>
            <!-- 将 el-dropdown 改为 el-select -->
            <el-select 
              v-model="selectedHost" 
              @change="onSelectHost" 
              placeholder="请选择主机"
              style="width: 200px"
            >
              <el-option
                v-for="host in hosts"
                :key="host"
                :label="host"
                :value="host">
              </el-option>
            </el-select>
          </div>
          <!-- API debug / toggle -->
          <div style="display:flex; align-items:center; gap:10px; margin-left:8px">
            <span style="color:#7f8c8d">API:</span>
            <el-tag size="small">{{ apiBase || 'proxy' }}</el-tag>
            <el-button size="mini" @click="toggleApi">切换到后端</el-button>
          </div>
        </div>
      </el-header>
      <el-main style="padding:20px">
        <el-row :gutter="20">
          <el-col :span="12" v-if="active === 'redis'">
            <div class="panel">
              <h3>Redis 推送</h3>
              <RedisPush :api-host="selectedHost" />
            </div>
          </el-col>
          <el-col :span="12" v-if="active === 'mongo'">
            <div class="panel">
              <h3>Mongo 脚本执行</h3>
              <MongoExec :api-host="selectedHost" />
            </div>
          </el-col>
          <!-- 新增文件展示区域 -->
          <el-col :span="24" v-if="active === 'files'">
            <div class="panel">
              <h3>文件列表</h3>
              <FileList :api-host="selectedHost" />
            </div>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import RedisPush from './components/RedisPush.vue'
import MongoExec from './components/MongoExec.vue'
// 导入新创建的文件列表组件
import FileList from './components/FileList.vue'

export default {
  components: { RedisPush, MongoExec, FileList },
  data() {
    return {
      active: 'redis',
      hosts: [],
      selectedHost: '',
      apiBase: ''
    }
  },
  mounted() {
    // API base (can be set via Vite env VITE_API, e.g. http://localhost:5000)
    this.apiBase = import.meta.env.VITE_API || ''
    // expose on window so child components can read and we can toggle at runtime
    if (typeof window !== 'undefined') window.__API_BASE__ = this.apiBase

    const API = this.apiBase

    // 优先从localStorage加载主机列表
    const savedHosts = this.loadHostsFromLocalStorage();
    if (savedHosts && savedHosts.length > 0) {
      this.hosts = savedHosts;
      // 恢复选中的主机
      const savedSelectedHost = localStorage.getItem('selectedHost');
      if (savedSelectedHost && this.hosts.includes(savedSelectedHost)) {
        this.selectedHost = savedSelectedHost;
      } else {
        this.selectedHost = this.hosts[0];
      }
      if (typeof window !== 'undefined') window.__SCRAPYD_SELECTED_HOST__ = this.selectedHost;
    }

    // fetch hosts from backend (robust handling for non-JSON / empty responses)
    const tryBackend = (url) => fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('hosts request failed: ' + r.status)
        const ct = r.headers.get('content-type') || ''
        if (!ct.includes('application/json')) throw new Error('hosts response not JSON: ' + ct)
        return r.json()
      })

    // First try proxied path (works when vite dev server proxy is active).
    // If you want to force requests to backend port 5000, set VITE_API=http://localhost:5000
    tryBackend(API ? `${API}/hosts` : '/hosts')
      .catch(err => {
        console.warn('initial /hosts fetch failed, trying direct backend fallback', err)
        // fallback to direct backend URL (useful during local dev if proxy isn't running)
        // 从环境变量获取后端API地址，如果没有则使用默认值
        const fallbackAPI = import.meta.env.VITE_BACKEND_API || 'http://127.0.0.1:5001'
        return tryBackend(`${fallbackAPI}/hosts`)
      })
      .then(j => {
        if (j && j.hosts && Array.isArray(j.hosts) && j.hosts.length) {
          this.hosts = j.hosts;
          // 保存到localStorage
          this.saveHostsToLocalStorage(this.hosts);
          
          // 如果还没有选中主机，则默认选中第一个
          if (!this.selectedHost) {
            this.selectedHost = this.hosts[0];
          }
          if (typeof window !== 'undefined') window.__SCRAPYD_SELECTED_HOST__ = this.selectedHost;
        } else {
          this.hosts = [];
        }
      })
      .catch(err => {
        console.error('failed to load hosts from both proxy and direct backend', err)
        this.hosts = []
      })
  },
  computed: {
    currentTitle() {
      switch (this.active) {
        case 'redis': return 'Redis 推送'
        case 'mongo': return 'Mongo 脚本执行'
        case 'files': return '文件列表'
        default: return ''
      }
    }
  },
  methods: {
    onSelect(key) { this.active = key },
    onSelectHost(host) {
      this.selectedHost = host
      if (typeof window !== 'undefined') window.__SCRAPYD_SELECTED_HOST__ = host
      // 保存选中的主机到localStorage
      localStorage.setItem('selectedHost', host);
    },
    // 新增方法：保存主机列表到localStorage
    saveHostsToLocalStorage(hosts) {
      try {
        localStorage.setItem('hosts', JSON.stringify(hosts));
      } catch (e) {
        console.error('Failed to save hosts to localStorage', e);
      }
    },
    // 新增方法：从localStorage加载主机列表
    loadHostsFromLocalStorage() {
      try {
        const hosts = localStorage.getItem('hosts');
        return hosts ? JSON.parse(hosts) : [];
      } catch (e) {
        console.error('Failed to load hosts from localStorage', e);
        return [];
      }
    },
    toggleApi() {
      // Toggle to force direct backend on (sets to http://localhost:5001)
      if (this.apiBase === (import.meta.env.VITE_BACKEND_API || 'http://127.0.0.1:5001')) {
        this.apiBase = ''
      } else {
        this.apiBase = import.meta.env.VITE_BACKEND_API || 'http://127.0.0.1:5001'
      }
      if (typeof window !== 'undefined') window.__API_BASE__ = this.apiBase
      
      // 当切换API时，直接设置主机为本地地址，而不尝试获取主机列表
      if (this.apiBase === (import.meta.env.VITE_BACKEND_API || 'http://127.0.0.1:5001')) {
        this.hosts = [this.apiBase];
        this.selectedHost = this.apiBase;
        // 更新全局变量
        if (typeof window !== 'undefined') window.__SCRAPYD_SELECTED_HOST__ = this.selectedHost;
      } else {
        // 切换回代理模式时，重新获取主机列表
        this.refreshHosts();
      }
    },
    // 新增方法：刷新主机列表
    refreshHosts() {
      const API = this.apiBase
      const tryBackend = (url) => fetch(url)
        .then(r => {
          if (!r.ok) throw new Error('hosts request failed: ' + r.status)
          const ct = r.headers.get('content-type') || ''
          if (!ct.includes('application/json')) throw new Error('hosts response not JSON: ' + ct)
          return r.json()
        })

      // First try proxied path (works when vite dev server proxy is active).
      // If you want to force requests to backend port 5000, set VITE_API=http://localhost:5000
      tryBackend(API ? `${API}/hosts` : '/hosts')
        .catch(err => {
          console.warn('initial /hosts fetch failed, trying direct backend fallback', err)
          // fallback to direct backend URL (useful during local dev if proxy isn't running)
          const fallbackAPI = import.meta.env.VITE_BACKEND_API || 'http://127.0.0.1:5001'
          return tryBackend(`${fallbackAPI}/hosts`)
        })
        .then(j => {
          if (j && j.hosts && Array.isArray(j.hosts) && j.hosts.length) {
            this.hosts = j.hosts;
            // 保存到localStorage
            this.saveHostsToLocalStorage(this.hosts);
            
            // 如果还没有选中主机，则默认选中第一个
            if (!this.selectedHost) {
              this.selectedHost = this.hosts[0];
            }
            if (typeof window !== 'undefined') window.__SCRAPYD_SELECTED_HOST__ = this.selectedHost;
          } else {
            this.hosts = [];
          }
        })
        .catch(err => {
          console.error('failed to load hosts from both proxy and direct backend', err)
          this.hosts = []
        })
    }
  }
}
</script>

<style>
html, body, #app { height: 100%; }
.el-aside { height: 100%; }
/* Menu styling adjustments */
.el-menu-vertical-demo .el-menu-item {
  color: #fff;
}
</style>
<style scoped>
.panel { background: transparent; padding: 18px; border-radius: 6px; }
</style>
