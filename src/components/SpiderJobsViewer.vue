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
                    type="primary" 
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
                    Log
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
                    type="primary" 
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
                    Log
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
          
          <el-tab-pane label="已完成" name="finished">
            <el-table :data="finishedJobs" style="width: 100%" v-loading="loading">
              <el-table-column prop="id" label="任务ID" width="300"></el-table-column>
              <el-table-column prop="spider" label="爬虫"></el-table-column>
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
                    type="primary" 
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
                    Log
                  </el-button>
                </template>
              </el-table-column>
              <!-- 操作列 -->
              <el-table-column label="操作" width="100" align="center">
                <template #default="{ row }">
                  <el-button 
                    v-if="row.status === 'cancelled'"
                    size="mini" 
                    type="success" 
                    @click="runSpider(row)"
                  >
                    Run
                  </el-button>
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
  </div>
</template>

<script>
import { io } from 'socket.io-client'

export default {
  name: 'SpiderJobsViewer',
  props: {
    apiHost: {
      type: String,
      default: ''
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
      currentJob: null
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
            this.projects = data.data.projects || []
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
    
    // 新增方法：打开日志链接
    openLog(job) {
      if (job.log_url) {
        // 构造完整的日志URL
        const logUrl = this.scrapydHost ? `${this.scrapydHost}${job.log_url}` : job.log_url
        // 在新窗口中打开日志链接
        window.open(logUrl, '_blank')
      } else {
        this.$message.warning('该任务没有可用的日志链接')
      }
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
        
        fetch(url, {
          method: 'DELETE'
        })
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
        
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobid: job.id
          })
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
      
      // 获取API基础地址
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      let socketUrl = 'http://127.0.0.1:5001' // 默认地址

      // 如果有API基础地址，使用它
      if (API) {
        socketUrl = API
      }
      
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
  }
}
</script>

<style scoped>
</style>
