<template>
  <div>
    <el-card>
      <div slot="header">
        <span>爬虫任务管理</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshAll">刷新任务</el-button>
      </div>
      
      <!-- 项目选择 -->
      <el-select 
        v-model="selectedProject" 
        placeholder="请选择项目" 
        @change="refreshJobs"
        style="width: 100%; margin-bottom: 20px;">
        <el-option
          v-for="project in projects"
          :key="project"
          :label="project"
          :value="project">
        </el-option>
      </el-select>
      
      <!-- 任务列表 -->
      <div v-if="selectedProject">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <el-tab-pane label="待处理" name="pending">
            <el-table :data="pendingJobs" style="width: 100%" v-loading="loading">
              <el-table-column prop="id" label="任务ID" width="300"></el-table-column>
              <el-table-column prop="spider" label="爬虫"></el-table-column>
              <el-table-column label="源码" width="72" align="center">
                <template #default="{ row }">
                  <el-button size="mini" type="text" :disabled="!row.spider" @click="openSpiderSource(row)">源码</el-button>
                </template>
              </el-table-column>
              <!-- 新增名单列 -->
              <el-table-column prop="silks" label="名单" width="150">
                <template #default="{ row }">
                  <el-button 
                    size="mini" 
                    type="text" 
                    @click="viewSilkList(row)"
                  >
                    查看名单
                  </el-button>
                </template>
              </el-table-column>
              <!-- 新增解析列 -->
              <el-table-column label="解析" width="100" align="center">
                <template #default="{ row }">
                  <el-button 
                    size="mini" 
                    type="text" 
                    @click="openParser(row)"
                  >
                    解析
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column prop="start_time" label="开始时间"></el-table-column>
              <el-table-column prop="update_time" label="更新时间"></el-table-column>
              <!-- Link列 -->
              <el-table-column label="Link" width="100" align="center">
                <template #default="{ row }">
                  <el-button 
                    size="mini" 
                    type="primary" 
                    @click="openLog(row)"
                    :disabled="!row.log_url"
                  >
                    实时日志
                  </el-button>
                </template>
              </el-table-column>
              <!-- 操作列 -->
              <el-table-column label="操作" width="100" align="center">
                <template #default="{ row }">
                  <el-button 
                    size="mini" 
                    type="warning" 
                    @click="cancelJob(row)"
                  >
                    Cancel
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="运行中" name="running">
            <el-table :data="runningJobs" style="width: 100%" v-loading="loading">
              <el-table-column prop="id" label="任务ID" width="300"></el-table-column>
              <el-table-column prop="spider" label="爬虫"></el-table-column>
              <el-table-column label="源码" width="72" align="center">
                <template #default="{ row }">
                  <el-button size="mini" type="text" :disabled="!row.spider" @click="openSpiderSource(row)">源码</el-button>
                </template>
              </el-table-column>
              <!-- 新增名单列 -->
              <el-table-column prop="silks" label="名单" width="150">
                <template #default="{ row }">
                  <el-button 
                    size="mini" 
                    type="text" 
                    @click="viewSilkList(row)"
                  >
                    查看名单
                  </el-button>
                </template>
              </el-table-column>
              <!-- 新增解析列 -->
              <el-table-column label="解析" width="100" align="center">
                <template #default="{ row }">
                  <el-button 
                    size="mini" 
                    type="text" 
                    @click="openParser(row)"
                  >
                    解析
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column prop="start_time" label="开始时间"></el-table-column>
              <el-table-column prop="update_time" label="更新时间"></el-table-column>
              <!-- Status列 -->
              <el-table-column label="Status" width="120" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'cancelled' ? 'danger' : 'info'">{{ row.status || '-' }}</el-tag>
                </template>
              </el-table-column>
              <!-- PID列 -->
              <el-table-column label="PID" width="100" align="center">
                <template #default="{ row }">
                  <span>{{ row.pid || '-' }}</span>
                </template>
              </el-table-column>
              <!-- Link列 -->
              <el-table-column label="Link" width="100" align="center">
                <template #default="{ row }">
                  <el-button 
                    size="mini" 
                    type="primary" 
                    @click="openLog(row)"
                    :disabled="!row.log_url"
                  >
                    实时日志
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column label="统计" width="88" align="center">
                <template #default="{ row }">
                  <el-button
                    size="mini"
                    type="success"
                    @click="analyzeJobLogLive(row)"
                    :disabled="!row.log_url"
                  >统计</el-button>
                </template>
              </el-table-column>
              <!-- 操作列 -->
              <el-table-column label="操作" width="100" align="center">
                <template #default="{ row }">
                  <el-button 
                    size="mini" 
                    type="warning" 
                    @click="cancelJob(row)"
                  >
                    Cancel
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="已完成" name="finished">
            <el-table :data="finishedJobs" style="width: 100%" v-loading="loading">
              <el-table-column prop="id" label="任务ID" width="260"></el-table-column>
              <el-table-column prop="spider" label="爬虫"></el-table-column>
              <el-table-column label="源码" width="64" align="center">
                <template #default="{ row }">
                  <el-button size="mini" type="text" :disabled="!row.spider" @click="openSpiderSource(row)">源码</el-button>
                </template>
              </el-table-column>
              <!-- 新增名单列 -->
              <el-table-column prop="silks" label="名单" width="100">
                <template #default="{ row }">
                  <el-button size="mini" type="text" @click="viewSilkList(row)">名单</el-button>
                </template>
              </el-table-column>
              <!-- 新增解析列 -->
              <el-table-column label="解析" width="80" align="center">
                <template #default="{ row }">
                  <el-button size="mini" type="text" @click="openParser(row)">解析</el-button>
                </template>
              </el-table-column>
              <el-table-column prop="start_time" label="开始时间" width="160"></el-table-column>
              <el-table-column prop="update_time" label="结束时间" width="160"></el-table-column>
              <!-- Status列 -->
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'cancelled' ? 'danger' : 'success'" size="small">
                    {{ row.status || '-' }}
                  </el-tag>
                </template>
              </el-table-column>
              <!-- Log列 -->
              <el-table-column label="日志" width="80" align="center">
                <template #default="{ row }">
                  <el-button size="mini" type="primary" @click="openLog(row)" :disabled="!row.log_url">实时日志</el-button>
                </template>
              </el-table-column>
              <!-- 日志分析列 -->
              <el-table-column label="统计" width="80" align="center">
                <template #default="{ row }">
                  <el-button
                    size="mini"
                    type="success"
                    @click="analyzeJobLog(row)"
                    :disabled="!row.log_url"
                  >分析</el-button>
                </template>
              </el-table-column>
              <!-- 操作列 -->
              <el-table-column label="操作" width="80" align="center">
                <template #default="{ row }">
                  <el-button v-if="row.status === 'cancelled'" size="mini" type="warning" @click="runSpider(row)">Run</el-button>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <div v-else>
        <el-alert
          title="请先选择一个项目"
          type="info"
          show-icon>
        </el-alert>
      </div>
    </el-card>
    
    <!-- 名单数据对话框 -->
    <el-dialog
      :title="`任务 ${currentJob ? currentJob.id : ''} 的名单数据`"
      v-model="silkDialogVisible"
      width="60%"
      @close="disconnectWebSocket"
    >
      <div v-loading="!isConnected">
        <el-alert 
          v-if="!isConnected" 
          title="正在连接WebSocket..." 
          type="info" 
          :closable="false">
        </el-alert>
        
        <el-table 
          :data="silkData" 
          style="width: 100%" 
          v-if="isConnected"
          max-height="400">
          <el-table-column prop="id" label="ID" width="80"></el-table-column>
          <el-table-column prop="name" label="名称"></el-table-column>
          <el-table-column prop="url" label="链接"></el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                {{ row.status || '-' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        
        <el-alert 
          v-if="isConnected && silkData.length === 0" 
          title="暂无名单数据" 
          type="warning" 
          :closable="false">
        </el-alert>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="silkDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 日志分析对话框 -->
    <el-dialog
      :title="logAnalysisDialogTitle"
      v-model="logAnalysisVisible"
      width="640px"
      @close="onLogAnalysisDialogClose"
    >
      <div v-loading="logAnalysisLoading" element-loading-text="正在读取并解析日志...">
        <div v-if="logAnalysisLiveMode" style="margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <el-tag type="success" size="small">WebSocket · 服务端定时依次统计</el-tag>
          <span v-if="logStatsSeq > 0" style="color:#606266;font-size:12px;">
            第 {{ logStatsSeq }} 次 · {{ logStatsLastAt }}
          </span>
        </div>
        <el-alert
          v-if="logAnalysisLiveMode && logAnalysisStreamError"
          :title="logAnalysisStreamError"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom:12px;"
        />
        <div v-if="logAnalysisData" class="log-analysis">
          <!-- KPI 卡片 -->
          <el-row :gutter="12" style="margin-bottom:16px">
            <el-col :span="8">
              <div class="stat-card blue">
                <div class="stat-val">{{ logAnalysisData.hit_url }}</div>
                <div class="stat-label">命中页面数 [HIT_URL]</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-card green">
                <div class="stat-val">{{ logAnalysisData.oss_success }}</div>
                <div class="stat-label">OSS 上传成功</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-card red">
                <div class="stat-val">{{ logAnalysisData.giving_up }}</div>
                <div class="stat-label">放弃 URL（超重试）</div>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="12" style="margin-bottom:20px">
            <el-col :span="8">
              <div class="stat-card orange">
                <div class="stat-val">{{ logAnalysisData.receive_url }}</div>
                <div class="stat-label">收到 URL [RECEIVE_URL]</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-card purple">
                <div class="stat-val">{{ logAnalysisData.retry_lines }}</div>
                <div class="stat-label">重试次数</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-card gray">
                <div class="stat-val">{{ logAnalysisData.error_lines }}</div>
                <div class="stat-label">ERROR 日志行</div>
              </div>
            </el-col>
          </el-row>

          <!-- 详细数据表格 -->
          <el-descriptions title="详细统计" :column="2" border size="small">
            <el-descriptions-item label="OSS 上传失败">{{ logAnalysisData.oss_failed }}</el-descriptions-item>
            <el-descriptions-item label="MySQL 写入成功">{{ logAnalysisData.mysql_success }}</el-descriptions-item>
            <el-descriptions-item label="MySQL 连接失败">{{ logAnalysisData.mysql_failed }}</el-descriptions-item>
            <el-descriptions-item label="清除去重记录">{{ logAnalysisData.clear_dupefilter }}</el-descriptions-item>
            <el-descriptions-item label="WARNING 日志行">{{ logAnalysisData.warning_lines }}</el-descriptions-item>
            <el-descriptions-item label="日志总行数">{{ logAnalysisData.total_lines }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <el-empty v-else-if="!logAnalysisLoading" description="暂无分析数据" />
      </div>
      <template #footer>
        <el-button @click="logAnalysisVisible = false">关闭</el-button>
        <el-button
          v-if="!logAnalysisLiveMode && logAnalysisJob"
          type="primary"
          @click="analyzeJobLog(logAnalysisJob)"
          :loading="logAnalysisLoading"
        >刷新</el-button>
        <span v-if="logAnalysisLiveMode" style="color:#909399;font-size:12px;margin-left:8px;">关闭窗口即停止推送</span>
      </template>
    </el-dialog>

    <!-- 实时日志（WebSocket 增量，不整文件打开新窗口） -->
    <el-dialog
      :title="jobLogTitle"
      v-model="jobLogDialogVisible"
      width="82%"
      top="4vh"
      destroy-on-close
      @close="onJobLogDialogClose"
    >
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px; flex-wrap:wrap;">
        <el-tag v-if="jobLogConnected" type="success" size="small">已连接 · 服务端轮询增量推送</el-tag>
        <el-tag v-else type="info" size="small">连接中…</el-tag>
        <el-button size="small" @click="clearJobLogText">清空显示</el-button>
        <span v-if="jobLogTruncatedHint" style="color:#909399;font-size:12px;">{{ jobLogTruncatedHint }}</span>
      </div>
      <pre ref="jobLogPre" class="job-log-pre">{{ jobLogText }}</pre>
      <template #footer>
        <el-button type="primary" @click="jobLogDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 线上爬虫 .py 源码（服务端磁盘，只读 CodeMirror） -->
    <SpiderSourceDrawer
      v-model="spiderSourceVisible"
      :project="sourceDrawerProject"
      :spider="sourceDrawerSpider"
    />
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { io } from 'socket.io-client'
import { getToken } from '../utils/auth.js'

const SpiderSourceDrawer = defineAsyncComponent(() => import('./SpiderSourceDrawer.vue'))

export default {
  name: 'SpiderJobsViewer',
  components: { SpiderSourceDrawer },
  props: {
    apiHost: {
      type: String,
      default: ''
    }
  },
  computed: {
    $fetch() {
      return (typeof window !== 'undefined' && window.__authFetch__) || fetch
    },
    jobLogTitle() {
      if (!this.currentLogJob) return '任务日志'
      const s = this.currentLogJob.spider || ''
      const id = this.currentLogJob.id || ''
      return `实时日志 — ${s} (${id})`
    },
    logAnalysisDialogTitle() {
      const j = this.logAnalysisJob
      const base = j ? `${j.spider || ''} (${j.id || ''})` : ''
      return this.logAnalysisLiveMode ? `实时统计 — ${base}` : `日志统计 — ${base}`
    }
  },
  data() {
    return {
      projects: [],
      selectedProject: '',
      pendingJobs: [],
      runningJobs: [],
      finishedJobs: [],
      activeTab: 'running',
      loading: false,
      // 保存从后端获取的host信息
      scrapydHost: '',
      // WebSocket相关数据
      socket: null,
      isConnected: false,
      silkData: [],
      silkDialogVisible: false,
      currentJob: null,
      // 日志分析
      logAnalysisVisible: false,
      logAnalysisLoading: false,
      logAnalysisData: null,
      logAnalysisJob: null,
      logAnalysisLiveMode: false,
      logStatsSeq: 0,
      logStatsLastAt: '',
      logAnalysisStreamError: '',
      jobStatsSocket: null,
      // 实时日志 WebSocket
      jobLogDialogVisible: false,
      jobLogText: '',
      jobLogSocket: null,
      jobLogConnected: false,
      jobLogTruncatedHint: '',
      currentLogJob: null,
      spiderSourceVisible: false,
      sourceDrawerProject: '',
      sourceDrawerSpider: '',
    }
  },
  mounted() {
    this.refreshProjects()
  },
  methods: {
    refreshProjects() {
      this.loading = true
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const baseUrl = API ? `${API}/scrapyd/projects` : `/scrapyd/projects`
      const url = this.apiHost ? `${baseUrl}?host=${encodeURIComponent(this.apiHost)}` : baseUrl
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.status === 'success') {
            this.projects = Array.isArray(data.data) ? data.data : (data.data.projects || [])
            if (this.projects.length > 0 && !this.selectedProject) {
              this.selectedProject = this.projects[0]
              this.refreshJobs()
            }else if(this.projects.length > 0 && this.selectedProject){
              this.refreshJobs()
            }
          } else {
            this.$message.error(data.message || '获取项目列表失败')
            this.projects = []
          }
          this.loading = false
        })
        .catch(error => {
          this.$message.error('获取项目列表失败: ' + error.message)
          this.projects = []
          this.loading = false
        })
    },
    refreshAll() {
      this.refreshProjects()
      // refreshProjects成功后会自动调用refreshJobs
    },
    
    refreshJobs() {
      if (!this.selectedProject) return
      
      this.loading = true
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const baseUrl = API ? `${API}/scrapyd/projects/${this.selectedProject}/jobs` : `/scrapyd/projects/${this.selectedProject}/jobs`
      const url = this.apiHost ? `${baseUrl}?host=${encodeURIComponent(this.apiHost)}` : baseUrl
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.status === 'success') {
            // 保存host信息
            this.scrapydHost = data.host || ''
            const jobs = data.data || []
            
            // 根据status分类任务
            this.pendingJobs = jobs.filter(job => job.status === 'pending')
            this.runningJobs = jobs.filter(job => job.status === 'running')
            this.finishedJobs = jobs.filter(job => job.status === 'finished' || job.status === 'cancelled')
            
          } else {
            this.$message.error(data.message || '获取任务列表失败')
            this.pendingJobs = []
            this.runningJobs = []
            this.finishedJobs = []
          }
          this.loading = false
        })
        .catch(error => {
          this.$message.error('获取任务列表失败: ' + error.message)
          this.pendingJobs = []
          this.runningJobs = []
          this.finishedJobs = []
          this.loading = false
        })
    },
    
    handleTabClick(tab) {
      // 可以在这里添加切换标签页时的逻辑
    },
    
    // 新增方法：打开解析页面
    openParser(job) {
      if (job.spider) {
        const parserUrl = `http://68.64.178.162:3000/parser/?id=${encodeURIComponent(job.spider)}`
        window.open(parserUrl, '_blank')
      } else {
        this.$message.warning('该任务没有爬虫信息')
      }
    },
    
    /** 从服务端读取当前项目下爬虫 .py（需配置 SPIDER_SOURCE_ROOT 等） */
    openSpiderSource(row) {
      if (!row || !row.spider) {
        this.$message.warning('该任务没有爬虫名')
        return
      }
      if (!this.selectedProject) {
        this.$message.warning('请先选择项目')
        return
      }
      this.sourceDrawerProject = this.selectedProject
      this.sourceDrawerSpider = row.spider
      this.spiderSourceVisible = true
    },

    resolveSocketBaseUrl() {
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      return API || 'http://127.0.0.1:5001'
    },

    parseLogJobMeta(job) {
      const parts = (job.log_url || '').split('/')
      const i = parts.findIndex((p) => p === 'logs')
      if (i >= 0 && parts.length > i + 3) {
        return {
          project: parts[i + 1] || this.selectedProject,
          spider: parts[i + 2] || job.spider,
          jobId: (parts[i + 3] || '').replace(/\.log$/i, '')
        }
      }
      return {
        project: parts[2] || this.selectedProject,
        spider: parts[3] || job.spider,
        jobId: (parts[4] || '').replace(/\.log$/i, '')
      }
    },

    /** 通过 WebSocket 增量查看日志（不再整文件新开窗口） */
    openLog(job) {
      if (!job || !job.log_url) {
        this.$message.warning('该任务没有可用的日志链接')
        return
      }
      this.currentLogJob = job
      this.jobLogText = ''
      this.jobLogTruncatedHint = ''
      this.jobLogConnected = false
      this.jobLogDialogVisible = true
      this.$nextTick(() => this.initJobLogSocket(job))
    },

    onJobLogDialogClose() {
      this.stopJobLogSocket()
      this.currentLogJob = null
    },

    clearJobLogText() {
      this.jobLogText = ''
    },

    appendJobLogChunk(chunk, opts = {}) {
      const MAX = 600000
      if (opts.reset) {
        this.jobLogText = chunk || ''
      } else {
        this.jobLogText += chunk || ''
      }
      if (this.jobLogText.length > MAX) {
        this.jobLogText = '…(已省略较早内容，保留最近约 600KB)…\n' + this.jobLogText.slice(-MAX)
      }
      this.$nextTick(() => {
        const el = this.$refs.jobLogPre
        if (el) el.scrollTop = el.scrollHeight
      })
    },

    initJobLogSocket(job) {
      this.stopJobLogSocket()
      const { project, spider, jobId } = this.parseLogJobMeta(job)
      if (!jobId) {
        this.$message.error('无法从 log_url 解析 job_id')
        return
      }
      const host = (this.scrapydHost || this.apiHost || '').replace(/\/$/, '')
      if (!host) {
        this.$message.error('未配置 Scrapyd 地址')
        return
      }

      const socketUrl = this.resolveSocketBaseUrl()
      try {
        this.jobLogSocket = io(socketUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 8,
          reconnectionDelay: 1000,
          timeout: 15000,
          forceNew: true
        })

        this.jobLogSocket.on('connect', () => {
          this.jobLogConnected = true
          this.jobLogSocket.emit('subscribe_job_log', {
            host,
            project,
            spider,
            job_id: jobId,
            token: getToken()
          })
        })

        this.jobLogSocket.on('disconnect', () => {
          this.jobLogConnected = false
        })

        this.jobLogSocket.on('job_log_data', (data) => {
          if (!data) return
          if (data.error) {
            // 轮询失败会反复推送，写入日志区避免 Message 刷屏
            this.appendJobLogChunk(`\n[${new Date().toLocaleTimeString()}] ${data.error}\n`)
            return
          }
          if (data.truncated) {
            this.jobLogTruncatedHint = '首次仅加载日志文件末尾约 256KB，后续自动追加新内容'
          }
          if (data.chunk != null && data.chunk !== '') {
            this.appendJobLogChunk(data.chunk, { reset: !!data.reset })
          }
        })

        this.jobLogSocket.on('connect_error', (err) => {
          this.$message.error('日志 WebSocket 连接失败: ' + (err && err.message ? err.message : String(err)))
        })
      } catch (e) {
        this.$message.error((e && e.message) || '日志 WebSocket 初始化失败')
      }
    },

    stopJobLogSocket() {
      if (this.jobLogSocket) {
        try {
          this.jobLogSocket.emit('unsubscribe_job_log')
        } catch (_) {}
        this.jobLogSocket.disconnect()
        this.jobLogSocket = null
      }
      this.jobLogConnected = false
    },
    
    // 修改方法：取消任务（原deleteJob方法）
    cancelJob(job) {
      // 弹出确认对话框
      this.$confirm(`确定要取消任务 ${job.id} 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 执行取消操作
        this.loading = true
        const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
        const baseUrl = API ? 
          `${API}/scrapyd/projects/${this.selectedProject}/jobs/${job.id}` : 
          `/scrapyd/projects/${this.selectedProject}/jobs/${job.id}`
        const url = this.apiHost ? `${baseUrl}?host=${encodeURIComponent(this.apiHost)}` : baseUrl
        
        this.$fetch(url, { method: 'DELETE' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.status === 'success') {
            this.$message.success('任务取消成功')
            // 刷新任务列表
            this.refreshJobs()
          } else {
            this.$message.error(data.message || '任务取消失败')
          }
          this.loading = false
        })
        .catch(error => {
          this.$message.error('任务取消失败: ' + error.message)
          this.loading = false
        })
      }).catch(() => {
        // 用户取消操作
        this.$message.info('已取消操作')
      })
    },
    
    // 新增方法：运行爬虫
    runSpider(job) {
      // 弹出确认对话框
      this.$confirm(`确定要重新运行爬虫 ${job.spider} 吗?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 执行运行操作
        this.loading = true
        const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
        const baseUrl = API ? 
          `${API}/scrapyd/projects/${this.selectedProject}/spiders/${job.spider}/run` : 
          `/scrapyd/projects/${this.selectedProject}/spiders/${job.spider}/run`
        const url = this.apiHost ? `${baseUrl}?host=${encodeURIComponent(this.apiHost)}` : baseUrl
        
        this.$fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobid: job.id })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.status === 'success') {
            this.$message.success('爬虫启动成功')
            // 刷新任务列表
            this.refreshJobs()
          } else {
            this.$message.error(data.message || '爬虫启动失败')
          }
          this.loading = false
        })
        .catch(error => {
          this.$message.error('爬虫启动失败: ' + error.message)
          this.loading = false
        })
      }).catch(() => {
        // 用户取消操作
        this.$message.info('已取消操作')
      })
    },
    
    // 新增方法：查看名单列表
    viewSilkList(job) {
      this.currentJob = job
      // 初始化WebSocket连接来获取名单数据
      this.initWebSocket(job)
      this.silkDialogVisible = true
    },
    
    // 初始化WebSocket连接
    initWebSocket(job) {
      // 如果已有连接，先断开
      if (this.socket) {
        this.socket.disconnect()
      }
      
      const socketUrl = this.resolveSocketBaseUrl()
      
      try {
        console.log('尝试连接WebSocket:', socketUrl)
        
        // 创建WebSocket连接 - 添加更多配置选项
        this.socket = io(socketUrl, {
          transports: ['websocket', 'polling'], // 首先尝试websocket，失败后使用polling
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000, // 10秒超时
          forceNew: true // 强制创建新连接
        })
        
        this.socket.on('connect', () => {
          console.log('WebSocket已连接, socket id:', this.socket.id)
          this.isConnected = true
          // 连接成功后发送订阅消息以获取名单数据
          if (job && job.spider) {
            this.socket.emit('subscribe_silk', { 
              jobId: job.id,
              spiderName: job.spider  // 传递爬虫名称
            })
          }
        })
        
        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket已断开, 原因:', reason)
          this.isConnected = false
          // 如果是服务器主动断开，尝试重连
          if (reason === 'io server disconnect') {
            this.socket.connect()
          }
        })
        
        // 监听名单数据更新
        this.socket.on('silk_data', (data) => {
          console.log('收到名单数据:', data)
          // 更新名单数据
          if (data && data.silks) {
            this.silkData = data.silks
          }
        })
        
        // 监听连接错误
        this.socket.on('connect_error', (error) => {
          console.error('WebSocket连接错误:', error)
          this.$message.error('WebSocket连接失败: ' + error.message)
        })
        
        // 监听通用错误
        this.socket.on('error', (error) => {
          console.error('WebSocket错误:', error)
          this.$message.error('WebSocket错误: ' + error.message)
        })
        
        // 监听连接确认
        this.socket.on('connected', (data) => {
          console.log('WebSocket连接确认:', data)
        })
        
      } catch (error) {
        console.error('WebSocket初始化失败:', error)
        this.$message.error('WebSocket初始化失败: ' + error.message)
      }
    },
    
    onLogAnalysisDialogClose() {
      if (this.logAnalysisLiveMode) {
        this.stopJobStatsSocket()
        this.logAnalysisLiveMode = false
        this.logAnalysisStreamError = ''
      }
    },

    /** 已完成任务：单次 HTTP 拉日志解析 */
    analyzeJobLog(job) {
      if (!job || !job.log_url) {
        this.$message.warning('该任务没有可用的日志')
        return
      }
      this.stopJobStatsSocket()
      this.logAnalysisLiveMode = false
      this.logAnalysisStreamError = ''
      this.logAnalysisJob = job
      this.logAnalysisVisible = true
      this.logAnalysisLoading = true
      this.logAnalysisData = null
      this.logStatsSeq = 0
      this.logStatsLastAt = ''

      const { project, spider, jobId } = this.parseLogJobMeta(job)
      const host = this.scrapydHost || this.apiHost || ''
      const API  = (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
      const url  = `${API}/stats/job_logs?host=${encodeURIComponent(host)}&project=${encodeURIComponent(project)}&spider=${encodeURIComponent(spider)}&job_id=${encodeURIComponent(jobId)}`

      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (data.status === 'success') {
            this.logAnalysisData = data.analysis
          } else {
            this.$message.error(data.message || '分析失败')
          }
        })
        .catch(e => this.$message.error('请求失败: ' + e.message))
        .finally(() => { this.logAnalysisLoading = false })
    },

    /** 运行中任务：WebSocket 每 2s 依次推送解析结果 */
    analyzeJobLogLive(job) {
      if (!job || !job.log_url) {
        this.$message.warning('该任务没有可用的日志')
        return
      }
      this.stopJobStatsSocket()
      this.logAnalysisJob = job
      this.logAnalysisLiveMode = true
      this.logAnalysisVisible = true
      this.logAnalysisLoading = true
      this.logAnalysisData = null
      this.logStatsSeq = 0
      this.logStatsLastAt = ''
      this.logAnalysisStreamError = ''
      this.$nextTick(() => this.initJobStatsSocket(job))
    },

    initJobStatsSocket(job) {
      this.stopJobStatsSocket()
      const { project, spider, jobId } = this.parseLogJobMeta(job)
      if (!jobId) {
        this.$message.error('无法从 log_url 解析 job_id')
        this.logAnalysisLoading = false
        return
      }
      const host = (this.scrapydHost || this.apiHost || '').replace(/\/$/, '')
      if (!host) {
        this.$message.error('未配置 Scrapyd 地址')
        this.logAnalysisLoading = false
        return
      }

      const socketUrl = this.resolveSocketBaseUrl()
      try {
        this.jobStatsSocket = io(socketUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 8,
          reconnectionDelay: 1000,
          timeout: 15000,
          forceNew: true
        })

        this.jobStatsSocket.on('connect', () => {
          this.jobStatsSocket.emit('subscribe_job_stats', {
            host,
            project,
            spider,
            job_id: jobId,
            token: getToken()
          })
        })

        this.jobStatsSocket.on('job_log_stats', (data) => {
          if (!data) return
          if (data.error) {
            this.logAnalysisStreamError = data.error
            this.logAnalysisLoading = false
            if (data.seq != null) {
              this.logStatsSeq = data.seq
              this.logStatsLastAt = data.at ? new Date(data.at * 1000).toLocaleTimeString() : ''
            }
            return
          }
          this.logAnalysisStreamError = ''
          if (data.analysis) {
            this.logAnalysisData = data.analysis
            this.logAnalysisLoading = false
          }
          if (data.seq != null) this.logStatsSeq = data.seq
          if (data.at) this.logStatsLastAt = new Date(data.at * 1000).toLocaleTimeString()
        })

        this.jobStatsSocket.on('connect_error', (err) => {
          this.logAnalysisLoading = false
          this.logAnalysisStreamError = '连接失败: ' + (err && err.message ? err.message : String(err))
        })
      } catch (e) {
        this.logAnalysisLoading = false
        this.logAnalysisStreamError = (e && e.message) || '初始化失败'
      }
    },

    stopJobStatsSocket() {
      if (this.jobStatsSocket) {
        try {
          this.jobStatsSocket.emit('unsubscribe_job_stats')
        } catch (_) {}
        this.jobStatsSocket.disconnect()
        this.jobStatsSocket = null
      }
    },

    // 断开WebSocket连接
    disconnectWebSocket() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
      }
    }
  },
  
  // 组件销毁前断开WebSocket连接
  beforeUnmount() {
    this.disconnectWebSocket()
    this.stopJobLogSocket()
    this.stopJobStatsSocket()
  }
}
</script>

<style scoped>
.log-analysis .stat-card {
  border-radius: 8px;
  padding: 14px 10px;
  text-align: center;
  color: #fff;
}
.stat-card.blue   { background: linear-gradient(135deg, #409eff, #66b1ff); }
.stat-card.green  { background: linear-gradient(135deg, #67c23a, #95d475); }
.stat-card.red    { background: linear-gradient(135deg, #f56c6c, #f89898); }
.stat-card.orange { background: linear-gradient(135deg, #e6a23c, #ebb563); }
.stat-card.purple { background: linear-gradient(135deg, #9c6fd4, #b88fe6); }
.stat-card.gray   { background: linear-gradient(135deg, #909399, #b1b3b8); }
.stat-val   { font-size: 26px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 12px; margin-top: 4px; opacity: 0.9; }

.job-log-pre {
  margin: 0;
  padding: 12px;
  max-height: 70vh;
  overflow: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  font-size: 12px;
  line-height: 1.45;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
