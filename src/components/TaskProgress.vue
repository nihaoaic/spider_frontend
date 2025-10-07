<template>
  <div>
    <el-card>
      <div slot="header">
        <span>任务进度</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshStatus">刷新</el-button>
      </div>
      
      <el-descriptions :column="1" border>
        <el-descriptions-item label="任务ID">{{ taskId }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(status)">
            {{ formatStatus(status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="开始时间" v-if="startTime">
          {{ formatTime(startTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="结束时间" v-if="endTime">
          {{ formatTime(endTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="耗时" v-if="duration">
          {{ duration.toFixed(2) }} 秒
        </el-descriptions-item>
        <el-descriptions-item label="推送数量" v-if="result && result.total_pushed">
          {{ result.total_pushed }}
        </el-descriptions-item>
        <el-descriptions-item label="队列长度" v-if="result && result.current_length">
          {{ result.current_length }}
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" v-if="error">
          <el-alert type="error" :closable="false" :title="error" />
        </el-descriptions-item>
      </el-descriptions>
      
      <!-- 进度条 -->
      <div v-if="status === 'processing'" style="margin-top: 20px;">
        <el-progress :percentage="progress" :indeterminate="true" status="active" />
        <p style="text-align: center; margin-top: 10px;">任务正在处理中...</p>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'TaskProgress',
  props: {
    taskId: {
      type: String,
      required: true
    },
    apiHost: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      status: '',
      startTime: null,
      endTime: null,
      duration: 0,
      result: null,
      error: '',
      progress: 0,
      refreshInterval: null
    }
  },
  mounted() {
    this.refreshStatus()

    // 从环境变量获取刷新间隔，如果没有设置则使用默认值2000毫秒
    const refreshInterval = parseInt(import.meta.env.VITE_TASK_REFRESH_INTERVAL || '2000');
    // 每隔指定时间自动刷新一次状态
    this.refreshInterval = setInterval(this.refreshStatus, refreshInterval)
  },
  beforeDestroy() {
    // 清除定时器
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  },
  methods: {
    refreshStatus() {
      if (!this.taskId) return
      
      // 使用统一的API地址处理方式
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const url = API ? `${API}/tasks/${this.taskId}` : `/tasks/${this.taskId}`

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
          
          // 更新任务状态
          this.status = data.status || ''
          this.startTime = data.startTime
          this.endTime = data.endTime
          this.duration = data.duration || 0
          this.result = data.result
          this.error = data.error || ''
          
          // 如果任务已完成或失败，清除定时器
          if (this.status === 'completed' || this.status === 'failed') {
            if (this.refreshInterval) {
              clearInterval(this.refreshInterval)
              this.refreshInterval = null
            }
            
            // 通知父组件任务已完成
            if (this.status === 'completed') {
              this.$emit('completed')
            }
          }
        })
        .catch(error => {
          this.$message.error('获取任务状态失败: ' + error.message)
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
    }
  }
}
</script>

<style scoped>
/* 添加一些样式 */
</style>
