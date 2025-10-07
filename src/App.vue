<template>
  <el-container style="height:100vh;">
    <el-aside width="220px" style="background:#2d3a4b; color:#fff; padding: 12px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:18px">
        <div style="width:36px; height:36px; background:#409EFF; border-radius:6px"></div>
        <div style="font-size:18px; font-weight:600">数据管理</div>
      </div>
      <el-menu default-active="redis" class="el-menu-vertical-demo" @select="onSelect" background-color="#2d3a4b" text-color="#fff" active-text-color="#ffd04b" :collapse="false">
        <el-menu-item index="redis">Redis 推送</el-menu-item>
        <el-menu-item index="mongo">Mongo 脚本</el-menu-item>
        <el-menu-item index="files">文件</el-menu-item>
        <el-menu-item index="tasks">查询任务</el-menu-item>
        <!-- 修改为多级菜单 -->
        <el-sub-menu index="spider">
          <template #title>
            <el-icon><Menu /></el-icon>
            <span>爬虫</span>
          </template>
          <el-menu-item index="spider-projects">项目</el-menu-item>
          <el-menu-item index="spider-jobs">Jobs</el-menu-item>
          <el-menu-item index="silk-logs">名单日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header style="text-align: right; font-size: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;">
        <div>
          <h2 style="margin: 0; color: #333;">{{ currentTitle }}</h2>
        </div>
        <div style="display: flex; align-items: center; gap: 20px;">
          <div v-if="hosts.length > 0" style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #666;">主机:</span>
            <el-select 
              v-model="selectedHost" 
              placeholder="选择主机" 
              size="small" 
              @change="onSelectHost"
              style="width: 200px;">
              <el-option
                v-for="host in hosts"
                :key="host"
                :label="host"
                :value="host">
              </el-option>
            </el-select>
          </div>
          <div style="display:flex; align-items:center; gap:10px; margin-left:8px">
            <span style="color:#7f8c8d">API:</span>
            <el-tag size="small">{{ apiBase || 'proxy' }}</el-tag>
            <el-button size="mini" @click="toggleApi">切换到后端</el-button>
          </div>
        </div>
      </el-header>
      
      <el-main style="padding:20px; background-color: #f5f5f5;">
        <!-- Redis 推送模块 -->
        <div v-show="active === 'redis'">
          <div class="panel">
            <RedisPush :api-host="selectedHost" />
          </div>
        </div>
        
        <!-- Mongo 脚本模块 -->
        <div v-show="active === 'mongo'">
          <div class="panel">
            <MongoExec :api-host="selectedHost" />
          </div>
        </div>
        
        <!-- 文件模块 -->
        <div v-show="active === 'files'">
          <div class="panel">
            <FileList :api-host="selectedHost" />
          </div>
        </div>
        
        <!-- 任务查询模块 -->
        <div v-show="active === 'tasks'">
          <div class="panel">
            <TaskList :api-host="selectedHost" />
          </div>
        </div>
        
        <!-- 爬虫项目模块 -->
        <div v-show="active === 'spider-projects'">
          <div class="panel">
            <SpiderManager :api-host="selectedHost" />
          </div>
        </div>
        
        <!-- 爬虫Jobs模块 -->
        <div v-show="active === 'spider-jobs'">
          <div class="panel">
            <SpiderJobsViewer :api-host="selectedHost" />
          </div>
        </div>
        
        <!-- 爬虫日志模块 -->
        <div v-show="active === 'silk-logs'">
          <div class="panel">
            <SilkLogs :api-host="selectedHost" />
          </div>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import RedisPush from './components/RedisPush.vue'
import MongoExec from './components/MongoExec.vue'
import FileList from './components/FileList.vue'
import TaskList from './components/TaskList.vue'
// 导入爬虫管理组件
import SpiderManager from './components/SpiderManager.vue'
// 导入新的爬虫Jobs和日志组件（需要后续创建）
import SpiderJobsViewer from './components/SpiderJobsViewer.vue'
import SilkLogs from './components/SilkLogs.vue'

import { Menu } from '@element-plus/icons-vue'
import { defineComponent } from 'vue'

export default defineComponent({
  components: { RedisPush, MongoExec, FileList, TaskList, SpiderManager, SpiderJobsViewer, SilkLogs, Menu },
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

    console.log('App mounted, API base:', this.apiBase) // 调试用

    // Load hosts from API (try proxy first, then direct backend)
    const API = this.apiBase
    const tryBackend = (url) => fetch(url).then(r => {
      if (!r.ok) throw new Error('hosts request failed: ' + r.status)
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('application/json')) throw new Error('hosts response not JSON: ' + ct)
      return r.json()
    })

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
  },
  computed: {
    currentTitle() {
      switch (this.active) {
        case 'redis': return 'Redis 推送'
        case 'mongo': return 'Mongo 脚本执行'
        case 'files': return '文件列表'
        case 'tasks': return '查询任务'
        case 'spider-projects': return '爬虫项目'
        case 'spider-jobs': return '爬虫任务'
        case 'silk-logs': return '名单日志'
        default: return ''
      }
    }
  },
  methods: {
    onSelect(key) { 
      this.active = key 
    },
    onSelectHost(host) {
      this.selectedHost = host
      if (typeof window !== 'undefined') window.__SCRAPYD_SELECTED_HOST__ = host
      // 保存选中的主机到localStorage
      localStorage.setItem('selectedHost', host);
    },
    saveHostsToLocalStorage(hosts) {
      localStorage.setItem('hosts', JSON.stringify(hosts));
    },
    toggleApi() {
      // Toggle to force direct backend on (sets to http://localhost:5001)
      if (this.apiBase === (import.meta.env.VITE_BACKEND_API || 'http://127.0.0.1:5001')) {
        this.apiBase = ''
      } else {
        this.apiBase = import.meta.env.VITE_BACKEND_API || 'http://127.0.0.1:5001'
      }
      if (typeof window !== 'undefined') window.__API_BASE__ = this.apiBase
    }
  }
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
.panel { background: transparent; padding: 18px; border-radius: 6px; }
</style>
