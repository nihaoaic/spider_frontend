<template>
  <div>
    <el-card>
      <div slot="header">
        <span>队列监控</span>
        <el-button 
          style="float: right; padding: 3px 0" 
          type="text" 
          @click="toggleConnection"
        >
          {{ isConnected ? '断开连接' : '连接监控' }}
        </el-button>
      </div>
      
      <div v-if="isConnected">
        <el-alert 
          type="success" 
          :closable="false" 
          title="已连接到WebSocket服务器" 
          style="margin-bottom: 20px;"
        />
        
        <el-table :data="queueData" style="width: 100%">
          <el-table-column prop="table" label="表名" width="200"></el-table-column>
          <el-table-column prop="current_length" label="队列长度" width="150"></el-table-column>
          <el-table-column prop="pushed_count" label="已推送数量" width="150"></el-table-column>
          <el-table-column prop="status" label="状态" width="120">
            <template #default="scope">
              <el-tag :type="getStatusTagType(scope.row.status)">
                {{ formatStatus(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="last_update" label="最后更新">
            <template #default="scope">
              {{ formatTime(scope.row.last_update) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div v-else>
        <el-alert 
          type="warning" 
          :closable="false" 
          title="未连接到WebSocket服务器" 
        />
      </div>
    </el-card>
  </div>
</template>

<script>
import { io } from 'socket.io-client'

export default {
  name: 'QueueMonitor',
  props: {
    apiHost: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      socket: null,
      isConnected: false,
      queueData: []
    }
  },
  computed: {
    socketUrl() {
      // 构建WebSocket URL
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      if (API) {
        // 将http/https替换为ws/wss
        return API.replace(/^http/, 'ws')
      }
      // 开发环境默认使用5001端口
      if (import.meta.env.DEV) {
        return 'ws://localhost:5001'
      }
      // 生产环境使用相对路径
      return ''
    }
  },
  methods: {
    toggleConnection() {
      if (this.isConnected) {
        this.disconnect()
      } else {
        this.connect()
      }
    },
    
    connect() {
      if (!this.socketUrl) {
        this.$message.error('无法确定WebSocket服务器地址')
        return
      }
      
      try {
        this.socket = io(this.socketUrl, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        })
        
        this.socket.on('connect', () => {
          console.log('WebSocket已连接')
          this.isConnected = true
          this.$message.success('WebSocket连接成功')
        })
        
        this.socket.on('disconnect', () => {
          console.log('WebSocket已断开')
          this.isConnected = false
          this.$message.warning('WebSocket连接已断开')
        })
        
        this.socket.on('queue_update', (data) => {
          console.log('收到队列更新:', data)
          this.updateQueueData(data)
        })
        
        this.socket.on('connect_error', (error) => {
          console.error('WebSocket连接错误:', error)
          this.$message.error('WebSocket连接失败: ' + error.message)
        })
        
      } catch (error) {
        console.error('WebSocket连接异常:', error)
        this.$message.error('WebSocket连接异常: ' + error.message)
      }
    },
    
    disconnect() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
      }
    },
    
    updateQueueData(data) {
      const now = new Date()
      const itemIndex = this.queueData.findIndex(item => item.table === data.table)
      
      if (itemIndex >= 0) {
        // 更新现有项 - 直接修改数组元素即可，Vue 3会自动追踪变化
        this.queueData[itemIndex] = {
          ...this.queueData[itemIndex],
          ...data,
          last_update: now
        }
      } else {
        // 添加新项
        this.queueData.push({
          ...data,
          last_update: now
        })
      }
    },
    
    // 格式化状态显示
    formatStatus(status) {
      if (!status) return '未知'
      
      const statusMap = {
        'completed': '已完成',
        'failed': '失败',
        'processing': '处理中'
      }
      return statusMap[status] || status
    },
    
    // 获取状态标签类型
    getStatusTagType(status) {
      if (!status) return 'info'
      
      const typeMap = {
        'completed': 'success',
        'failed': 'danger',
        'processing': 'warning'
      }
      return typeMap[status] || 'info'
    },
    
    // 格式化时间
    formatTime(date) {
      return date ? date.toLocaleString() : '-'
    }
  },
  
  beforeDestroy() {
    this.disconnect()
  }
}
</script>

<style scoped>
/* 添加一些样式 */
</style>
