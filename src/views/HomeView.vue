<template>
  <el-container style="height:100vh;">
    <!-- 侧边栏 -->
    <el-aside width="220px" style="background:#2d3a4b; color:#fff; padding: 12px; display:flex; flex-direction:column;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:18px">
        <div style="font-size:28px; line-height:1;">🕷</div>
        <div style="font-size:18px; font-weight:600">Spider Server</div>
      </div>
      <el-menu
        default-active="redis"
        class="side-menu"
        @select="onSelect"
        background-color="#2d3a4b"
        text-color="#ccc"
        active-text-color="#ffd04b"
        :collapse="false"
        style="flex:1; border:none;"
      >
        <el-menu-item index="redis">
          <el-icon><DataLine /></el-icon>Redis 推送
        </el-menu-item>
        <el-menu-item index="mongo">
          <el-icon><Document /></el-icon>Mongo 脚本
        </el-menu-item>
        <el-menu-item index="python-pad">
          <el-icon><EditPen /></el-icon>Python 编辑
        </el-menu-item>
        <el-menu-item index="files">
          <el-icon><FolderOpened /></el-icon>文件
        </el-menu-item>
        <el-menu-item index="tasks">
          <el-icon><List /></el-icon>查询任务
        </el-menu-item>
        <el-menu-item index="stats">
          <el-icon><TrendCharts /></el-icon>监控统计
        </el-menu-item>
        <el-sub-menu index="spider">
          <template #title>
            <el-icon><Menu /></el-icon><span>爬虫</span>
          </template>
          <el-menu-item index="spider-projects">项目</el-menu-item>
          <el-menu-item index="spider-jobs">Jobs</el-menu-item>
          <el-menu-item index="silk-logs">名单日志</el-menu-item>
        </el-sub-menu>
      </el-menu>

      <!-- 用户信息区 -->
      <div class="user-panel">
        <el-avatar :size="32" style="background:#409EFF; flex-shrink:0;">
          {{ (currentUser && currentUser.username || 'U')[0].toUpperCase() }}
        </el-avatar>
        <div class="user-info">
          <div class="user-name">{{ currentUser && currentUser.username || '-' }}</div>
          <el-tag size="small" :type="currentUser && currentUser.role === 'admin' ? 'warning' : 'info'" effect="dark">
            {{ currentUser && currentUser.role || 'user' }}
          </el-tag>
        </div>
        <el-button
          type="danger"
          size="small"
          text
          style="color:#ff7875;"
          @click="logout"
          title="退出登录"
        >
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
    </el-aside>

    <el-container>
      <!-- 顶部 Header -->
      <el-header style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding: 0 20px;">
        <h2 style="margin:0; color:#333; font-size:18px;">{{ currentTitle }}</h2>
        <div style="display:flex; align-items:center; gap:16px;">
          <div v-if="hosts.length > 0" style="display:flex; align-items:center; gap:8px;">
            <span style="color:#666; font-size:13px;">Scrapyd:</span>
            <el-select
              v-model="selectedHost"
              placeholder="选择主机"
              size="small"
              @change="onSelectHost"
              style="width:200px;"
            >
              <el-option v-for="h in hosts" :key="h" :label="h" :value="h" />
            </el-select>
          </div>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main style="padding:20px; background:#f5f5f5; overflow:auto;">
        <div v-show="active === 'stats'" class="panel"><SpiderStats :api-host="selectedHost" /></div>
        <div v-show="active === 'redis'" class="panel"><RedisPush :api-host="selectedHost" /></div>
        <div v-show="active === 'mongo'" class="panel"><MongoExec :api-host="selectedHost" /></div>
        <div v-if="active === 'python-pad'" class="panel"><PythonPad /></div>
        <div v-show="active === 'files'" class="panel"><FileList :api-host="selectedHost" /></div>
        <div v-show="active === 'tasks'" class="panel"><TaskList :api-host="selectedHost" /></div>
        <div v-show="active === 'spider-projects'" class="panel"><SpiderManager :api-host="selectedHost" /></div>
        <div v-show="active === 'spider-jobs'" class="panel"><SpiderJobsViewer :api-host="selectedHost" /></div>
        <div v-show="active === 'silk-logs'" class="panel"><SilkLogs :api-host="selectedHost" /></div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import SpiderStats from '../components/SpiderStats.vue'
import RedisPush from '../components/RedisPush.vue'
import MongoExec from '../components/MongoExec.vue'
import FileList from '../components/FileList.vue'
import TaskList from '../components/TaskList.vue'
import SpiderManager from '../components/SpiderManager.vue'
import SpiderJobsViewer from '../components/SpiderJobsViewer.vue'
import SilkLogs from '../components/SilkLogs.vue'

import { Menu, DataLine, Document, FolderOpened, List, SwitchButton, TrendCharts, Refresh, EditPen } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUser, removeToken, isLoggedIn, authFetch } from '../utils/auth.js'

const PythonPad = defineAsyncComponent(() => import('../components/PythonPad.vue'))

export default {
  name: 'HomeView',
  components: {
    RedisPush, MongoExec, FileList, TaskList,
    SpiderStats, SpiderManager, SpiderJobsViewer, SilkLogs, PythonPad,
    Menu, DataLine, Document, FolderOpened, List, SwitchButton, TrendCharts, Refresh, EditPen,
  },
  data() {
    return {
      active: 'redis',
      hosts: [],
      selectedHost: '',
      currentUser: null,
    }
  },
  computed: {
    currentTitle() {
      const map = {
        stats: '监控统计',
        redis: 'Redis 推送',
        mongo: 'Mongo 脚本执行',
        'python-pad': 'Python 编辑',
        files: '文件列表',
        tasks: '查询任务',
        'spider-projects': '爬虫项目',
        'spider-jobs': '爬虫任务',
        'silk-logs': '名单日志',
      }
      return map[this.active] || ''
    },
  },
  async mounted() {
    // 用户信息
    this.currentUser = getUser()

    // 全局暴露 authFetch，供子组件使用
    window.__authFetch__ = authFetch

    // 加载 Scrapyd hosts
    const base = import.meta.env.VITE_API || ''
    window.__API_BASE__ = base

    const savedHost = localStorage.getItem('selectedHost')

    try {
      const res = await fetch(`${base}/hosts`)
      const data = await res.json()
      if (data.hosts && data.hosts.length) {
        this.hosts = data.hosts
        this.selectedHost = savedHost && data.hosts.includes(savedHost)
          ? savedHost
          : data.hosts[0]
        window.__SCRAPYD_SELECTED_HOST__ = this.selectedHost
        localStorage.setItem('hosts', JSON.stringify(data.hosts))
      }
    } catch (e) {
      console.warn('无法获取 hosts:', e)
    }
  },
  methods: {
    onSelect(key) {
      this.active = key
    },
    onSelectHost(host) {
      this.selectedHost = host
      window.__SCRAPYD_SELECTED_HOST__ = host
      localStorage.setItem('selectedHost', host)
    },
    async logout() {
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
          confirmButtonText: '退出',
          cancelButtonText: '取消',
          type: 'warning',
        })
        removeToken()
        ElMessage.success('已退出登录')
        this.$router.push('/login')
      } catch {
        // 用户取消
      }
    },
  },
}
</script>

<style scoped>
.side-menu .el-menu-item,
.side-menu .el-sub-menu__title {
  border-radius: 6px;
  margin-bottom: 2px;
}

.user-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 4px 4px;
  border-top: 1px solid rgba(255,255,255,0.1);
  margin-top: 8px;
}

.user-info {
  flex: 1;
  overflow: hidden;
}

.user-name {
  font-size: 13px;
  color: #eee;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel {
  background: transparent;
  padding: 0;
  border-radius: 6px;
}
</style>
