<template>
  <div>
    <el-card>
      <div slot="header">
        <span>任务列表</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshTasks">刷新</el-button>
      </div>
      
      <!-- 任务列表 -->
      <el-table :data="tasks" style="width: 100%" v-loading="loading">
        <el-table-column prop="taskId" label="任务ID" width="200"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">
              {{ formatStatus(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="160">
          <template #default="scope">
            {{ formatTime(scope.row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="endTime" label="结束时间" width="160">
          <template #default="scope">
            {{ formatTime(scope.row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时(秒)" width="100">
          <template #default="scope">
            {{ scope.row.duration ? scope.row.duration.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button size="mini" @click="viewTaskDetail(scope.row.taskId)" :disabled="!scope.row.taskId">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="totalTasks"
        style="margin-top: 20px; text-align: right;">
      </el-pagination>
    </el-card>
    
    <!-- 任务详情对话框 -->
    <!-- 修复：使用v-model替代:visible.sync -->
    <el-dialog :title="'任务详情 - ' + currentTask.taskId" v-model="dialogVisible" width="60%">
      <el-descriptions :column="1" border v-if="currentTask.taskId">
        <el-descriptions-item label="任务ID">{{ currentTask.taskId }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(currentTask.status)">
            {{ formatStatus(currentTask.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="开始时间" v-if="currentTask.startTime">
          {{ formatTime(currentTask.startTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="结束时间" v-if="currentTask.endTime">
          {{ formatTime(currentTask.endTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="耗时" v-if="currentTask.duration">
          {{ currentTask.duration.toFixed(2) }} 秒
        </el-descriptions-item>
        <el-descriptions-item label="推送数量" v-if="currentTask.result && currentTask.result.total_pushed">
          {{ currentTask.result.total_pushed }}
        </el-descriptions-item>
        <el-descriptions-item label="队列长度" v-if="currentTask.result && currentTask.result.current_length">
          {{ currentTask.result.current_length }}
        </el-descriptions-item>
        <el-descriptions-item label="文件行数" v-if="currentTask.result && currentTask.result.file_lines">
          {{ currentTask.result.file_lines }}
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" v-if="currentTask.error">
          <el-alert type="error" :closable="false" :title="currentTask.error" />
        </el-descriptions-item>
      </el-descriptions>
      
      <!-- 队列信息 -->
      <div v-if="queueInfo && queueInfo.length !== undefined" class="queue-info" style="margin-top: 20px;">
        <el-divider>队列信息</el-divider>
        <el-card>
          <div slot="header">
            <span>{{ queueInfo.table }} 队列信息</span>
            <!-- 修改为打开新页面的按钮 -->
            <el-button 
              style="float: right; padding: 3px 0" 
              type="primary" 
              size="small"
              @click="openQueueMonitorPage(queueInfo.table)"
            >
              监控队列
            </el-button>
          </div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="队列键名">{{ queueInfo.redis_key }}</el-descriptions-item>
            <el-descriptions-item label="队列长度">{{ queueInfo.length }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="queueInfo.sample_data && queueInfo.sample_data.length > 0">
            <h4>样本数据:</h4>
            <el-table :data="queueInfo.sample_data.map((item, index) => ({index, item}))" size="small">
              <el-table-column prop="index" label="#" width="50"></el-table-column>
              <el-table-column prop="item" label="URL"></el-table-column>
            </el-table>
          </div>
        </el-card>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">关 闭</el-button>
        <el-button type="primary" @click="refreshTaskDetail">刷 新</el-button>
      </span>
    </el-dialog>
    
    <!-- 队列监控对话框 -->
    <el-dialog 
      :title="'队列监控 - ' + monitoringTable" 
      :visible.sync="monitorDialogVisible" 
      width="80%" 
      @close="closeQueueMonitor"
      :before-close="handleMonitorClose"
    >
      <div v-if="isMonitorConnected">
        <el-alert 
          type="success" 
          :closable="false" 
          title="已连接到WebSocket服务器" 
          style="margin-bottom: 20px;"
        />
        
        <!-- 队列URL列表 -->
        <el-table 
          :data="queueUrls" 
          style="width: 100%" 
          height="400"
          v-loading="monitorLoading"
        >
          <el-table-column type="index" label="#" width="60"></el-table-column>
          <el-table-column prop="url" label="URL"></el-table-column>
          <el-table-column prop="timestamp" label="添加时间" width="180">
            <template #default="scope">
              {{ formatTime(scope.row.timestamp) }}
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页信息 -->
        <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <el-tag>队列长度: {{ queueLength }}</el-tag>
            <el-tag style="margin-left: 10px;">显示数量: {{ queueUrls.length }}</el-tag>
          </div>
          <div>
            <el-pagination
              @current-change="handleMonitorPageChange"
              :current-page="monitorPage"
              :page-size="monitorPageSize"
              :total="queueLength"
              layout="prev, pager, next"
              small
            >
            </el-pagination>
          </div>
        </div>
      </div>
      
      <div v-else>
        <el-alert 
          type="warning" 
          :closable="false" 
          title="未连接到WebSocket服务器" 
        />
        <div style="text-align: center; margin-top: 20px;">
          <el-button 
            type="primary" 
            @click="connectQueueMonitor"
            :loading="connecting"
          >
            {{ connecting ? '连接中...' : '连接监控' }}
          </el-button>
        </div>
      </div>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="closeQueueMonitor">关 闭</el-button>
        <el-button 
          type="primary" 
          @click="refreshQueueMonitor" 
          :loading="monitorLoading"
        >
          刷 新
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { io } from 'socket.io-client'

export default {
  name: 'TaskList',
  props: {
    apiHost: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      tasks: [],
      loading: false,
      currentPage: 1,
      pageSize: 10,
      totalTasks: 0,
      dialogVisible: false,
      currentTask: {
        taskId: '',
        status: '',
        startTime: null,
        endTime: null,
        duration: 0,
        result: null,
        error: ''
      },
      queueInfo: null,
      
      // 队列监控相关数据
      monitorDialogVisible: false,
      monitoringTable: '',
      isMonitorConnected: false,
      connecting: false,
      monitorSocket: null,
      queueUrls: [],
      queueLength: 0,
      monitorLoading: false,
      monitorPage: 1,
      monitorPageSize: 100
    }
  },
  mounted() {
    this.refreshTasks()
  },
  methods: {
    // 刷新任务列表
    refreshTasks() {
      this.loading = true
      
      // 使用统一的API地址处理方式
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const url = `${API ? `${API}/tasks` : '/tasks'}?page=${this.currentPage}&page_size=${this.pageSize}`
      
      // 从后端API获取任务列表
      fetch(url)
        .then(response => {
          // 检查响应状态
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          // 检查响应内容类型
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            // 如果不是JSON响应，读取响应文本以查看实际内容
            return response.text().then(text => {
              throw new Error(`Received non-JSON response from server. Content: ${text.substring(0, 200)}...`)
            })
          }
          
          return response.json()
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.error)
          }
          if (data.tasks) {
            this.tasks = Array.isArray(data.tasks) ? data.tasks : []
            this.totalTasks = data.total || 0
          } else {
            this.tasks = []
            this.totalTasks = 0
          }
          this.loading = false
        })
        .catch(error => {
          this.loading = false
          this.$message({
            message: '获取任务列表失败: ' + error.message,
            type: 'error'
          })
        })
    },
    
    // 查看任务详情
    viewTaskDetail(taskId) {
      if (!taskId) {
        this.$message({
          message: '任务ID无效',
          type: 'warning'
        })
        return
      }
      
      // 重置当前任务和队列信息
      this.currentTask = {
        taskId: '',
        status: '',
        startTime: null,
        endTime: null,
        duration: 0,
        result: null,
        error: ''
      }
      this.queueInfo = null
      
      this.currentTask.taskId = taskId
      this.fetchTaskDetail(taskId)
      this.dialogVisible = true
    },
    
    // 获取任务详情
    fetchTaskDetail(taskId) {
      if (!taskId) {
        this.$message({
          message: '任务ID无效',
          type: 'warning'
        })
        return
      }
      
      // 使用统一的API地址处理方式
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const url = API ? `${API}/tasks/${taskId}` : `/tasks/${taskId}`
      
      // 从后端API获取任务详情
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            return response.text().then(text => {
              throw new Error(`Received non-JSON response from server. Content: ${text.substring(0, 200)}...`)
            })
          }
          
          return response.json()
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.error)
          }
          if (data.taskId) {
            // 直接赋值确保响应式更新
            this.currentTask = {
              taskId: data.taskId || '',
              status: data.status || '',
              startTime: data.startTime !== undefined ? data.startTime : null,
              endTime: data.endTime !== undefined ? data.endTime : null,
              duration: data.duration || 0,
              result: data.result || null,
              error: data.error || '',
              table: data.table || ''  // 添加table字段
            }
            
            // 如果任务已完成，获取队列信息
            if (data.status === 'completed' && data.result && data.table) {
              this.fetchQueueInfo(data.table)
            }
          } else {
            this.$message({
              message: '任务不存在',
              type: 'warning'
            })
          }
        })
        .catch(error => {
          this.$message({
            message: '获取任务详情失败: ' + error.message,
            type: 'error'
          })
        })
    },
    
    // 获取队列信息
    fetchQueueInfo(tableName) {
      if (!tableName) {
        return
      }
      
      // 使用统一的API地址处理方式
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const url = API ? `${API}/redis/queue/${tableName}` : `/redis/queue/${tableName}`
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            return response.text().then(text => {
              throw new Error(`Received non-JSON response from server. Content: ${text.substring(0, 200)}...`)
            })
          }
          
          return response.json()
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.error)
          }
          if (data.result) {
            this.queueInfo = data.result
          }
        })
        .catch(error => {
          this.$message({
            message: '获取队列信息失败: ' + error.message,
            type: 'error'
          })
        })
    },
    
    // 格式化状态显示
    formatStatus(status) {
      if (!status) return ''
      
      const statusMap = {
        'processing': '处理中',
        'completed': '已完成',
        'failed': '失败'
      }
      return statusMap[status] || status
    },
    
    // 获取状态标签类型
    getStatusTagType(status) {
      if (!status) return 'info'
      
      const typeMap = {
        'processing': 'warning',
        'completed': 'success',
        'failed': 'danger'
      }
      return typeMap[status] || 'info'
    },
    
    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return '-'
      
      const ts = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp
      if (isNaN(ts)) return '-'
      const date = new Date(ts * 1000)
      return date.toLocaleString()
    },
    
    // 分页相关方法
    handleSizeChange(val) {
      this.pageSize = val
      this.refreshTasks()
    },
    
    handleCurrentChange(val) {
      this.currentPage = val
      this.refreshTasks()
    },
    
    // 刷新任务详情
    refreshTaskDetail() {
      if (this.currentTask.taskId) {
        // 重置队列信息再刷新
        this.queueInfo = null
        this.fetchTaskDetail(this.currentTask.taskId)
      }
    },
    
    // 处理对话框关闭
    handleDialogClose() {
      // 关闭主对话框时也关闭监控对话框
      this.closeQueueMonitor()
    },
    
    // 打开队列监控
    openQueueMonitor(table) {
      if (!table) {
        this.$message.warning('队列表名无效')
        return
      }
      
      this.monitoringTable = table
      this.monitorDialogVisible = true
      this.$nextTick(() => {
        this.connectQueueMonitor()
      })
    },
    
    // 连接队列监控
    connectQueueMonitor() {
      if (this.isMonitorConnected || this.connecting) return
      
      this.connecting = true
      this.monitorLoading = true
      
      try {
        // 构建WebSocket URL
        const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
        let socketUrl = ''
        
        if (API) {
          // 将http/https替换为ws/wss
          socketUrl = API.replace(/^http/, 'ws')
        } else {
          // 开发环境默认使用5001端口
          if (import.meta.env.DEV) {
            socketUrl = 'ws://localhost:5001'
          }
        }
        
        if (!socketUrl) {
          this.$message.error('无法确定WebSocket服务器地址')
          this.connecting = false
          this.monitorLoading = false
          return
        }
        
        // 关闭现有连接
        if (this.monitorSocket) {
          this.monitorSocket.disconnect()
        }
        
        // 创建新的WebSocket连接
        this.monitorSocket = io(socketUrl, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        })
        
        this.monitorSocket.on('connect', () => {
          console.log('队列监控WebSocket已连接')
          this.isMonitorConnected = true
          this.connecting = false
          this.monitorLoading = false
          this.$message.success('WebSocket连接成功')
          
          // 订阅队列更新
          this.monitorSocket.emit('subscribe_queue', { table: this.monitoringTable })
          
          // 获取初始队列数据
          this.refreshQueueMonitor()
        })
        
        this.monitorSocket.on('disconnect', () => {
          console.log('队列监控WebSocket已断开')
          this.isMonitorConnected = false
          this.connecting = false
          this.monitorLoading = false
          this.$message.warning('WebSocket连接已断开')
        })
        
        this.monitorSocket.on('queue_urls', (data) => {
          console.log('收到队列URL更新:', data)
          this.updateQueueUrls(data)
        })
        
        this.monitorSocket.on('connect_error', (error) => {
          console.error('队列监控WebSocket连接错误:', error)
          this.$message.error('WebSocket连接失败: ' + error.message)
          this.isMonitorConnected = false
          this.connecting = false
          this.monitorLoading = false
        })
        
      } catch (error) {
        console.error('队列监控WebSocket连接异常:', error)
        this.$message.error('WebSocket连接异常: ' + error.message)
        this.isMonitorConnected = false
        this.connecting = false
        this.monitorLoading = false
      }
    },
    
    // 关闭队列监控
    closeQueueMonitor() {
      if (this.monitorSocket) {
        this.monitorSocket.disconnect()
        this.monitorSocket = null
      }
      this.isMonitorConnected = false
      this.monitorDialogVisible = false
      this.monitoringTable = ''
      this.queueUrls = []
      this.queueLength = 0
    },
    
    // 处理监控对话框关闭
    handleMonitorClose(done) {
      this.closeQueueMonitor()
      done()
    },
    
    // 刷新队列监控
    refreshQueueMonitor() {
      if (!this.isMonitorConnected || !this.monitoringTable) {
        return
      }
      
      this.monitorLoading = true
      
      // 请求获取队列URL数据
      this.monitorSocket.emit('get_queue_urls', {
        table: this.monitoringTable,
        page: this.monitorPage,
        page_size: this.monitorPageSize
      })
    },
    
    // 更新队列URL数据
    updateQueueUrls(data) {
      if (data.table === this.monitoringTable) {
        this.queueLength = data.total || 0
        this.queueUrls = (data.urls || []).map((url, index) => ({
          url: url,
          timestamp: Date.now() - Math.random() * 100000 // 模拟时间戳
        }))
        this.monitorLoading = false
      }
    },
    
    // 处理监控分页变化
    handleMonitorPageChange(page) {
      this.monitorPage = page
      this.refreshQueueMonitor()
    },
    
    // 打开队列监控新页面 - 修复版本
    openQueueMonitorPage(table) {
      if (!table) {
        this.$message.warning('队列表名无效')
        return
      }
      
      // 构建URL并直接打开新窗口，避免使用router
      const baseUrl = window.location.origin
      const monitorUrl = `${baseUrl}/#/queue-monitor?table=${encodeURIComponent(table)}`
      window.open(monitorUrl, '_blank')
    }
  }
}
</script>

<style scoped>
.queue-info {
  margin-top: 20px;
}
</style>