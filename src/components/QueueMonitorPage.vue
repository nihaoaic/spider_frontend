<template>
  <div style="padding: 20px;">
    <el-card>
      <div slot="header">
        <span>队列监控 - {{ tableName }}</span>
        <div style="float: right;">
          <el-button 
            type="primary" 
            @click="connectWebSocket"
            :loading="connecting"
            :disabled="isConnected"
          >
            {{ isConnected ? '已连接' : (connecting ? '连接中...' : '连接WebSocket') }}
          </el-button>
          <el-button 
            @click="disconnectWebSocket"
            :disabled="!isConnected"
            style="margin-left: 10px;"
          >
            断开连接
          </el-button>
          <el-button 
            @click="refreshData"
            :loading="loading"
            :disabled="!isConnected"
            style="margin-left: 10px;"
          >
            刷新数据
          </el-button>
        </div>
      </div>
      
      <div v-if="isConnected">
        <el-alert 
          type="success" 
          :closable="false" 
          title="已连接到WebSocket服务器" 
          style="margin-bottom: 20px;"
        />
        
        <!-- 队列统计信息 -->
        <el-card style="margin-bottom: 20px;">
          <div slot="header">
            <span>队列统计</span>
          </div>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-statistic title="队列长度" :value="queueLength" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="已显示URL数量" :value="queueUrls.length" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="最后更新时间" :value="lastUpdateTime">
                <template #formatter>
                  {{ lastUpdateTime ? formatTime(lastUpdateTime) : '-' }}
                </template>
              </el-statistic>
            </el-col>
          </el-row>
        </el-card>
        
        <!-- 队列URL列表 -->
        <el-table 
          :data="queueUrls" 
          style="width: 100%" 
          height="500"
          v-loading="loading"
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
              @current-change="handlePageChange"
              :current-page="currentPage"
              :page-size="pageSize"
              :total="queueLength"
              layout="prev, pager, next, jumper"
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
            @click="connectWebSocket"
            :loading="connecting"
          >
            {{ connecting ? '连接中...' : '连接WebSocket' }}
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { io } from 'socket.io-client'

export default {
  name: 'QueueMonitorPage',
  data() {
    return {
      tableName: '',
      socket: null,
      isConnected: false,
      connecting: false,
      loading: false,
      queueUrls: [],
      queueLength: 0,
      currentPage: 1,
      pageSize: 100,
      lastUpdateTime: null
    }
  },
  mounted() {
    // 修复URL参数获取方式
    this.getTableNameFromUrl()
    
    if (this.tableName) {
      // 自动连接WebSocket
      this.$nextTick(() => {
        this.connectWebSocket()
      })
    }
  },
  beforeUnmount() {
    // 组件销毁前断开连接
    this.disconnectWebSocket()
  },
  methods: {
    // 从URL中获取表名
    getTableNameFromUrl() {
      // 处理hash模式路由
      const hash = window.location.hash
      if (hash.includes('?')) {
        const searchParams = new URLSearchParams(hash.split('?')[1])
        this.tableName = searchParams.get('table') || ''
      }
    },
    
    // 连接WebSocket
    connectWebSocket() {
      if (this.isConnected || this.connecting) return
      
      this.connecting = true
      this.loading = true
      
      try {
        // 构建WebSocket URL
        const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
        let socketUrl = ''
        
        if (API_BASE) {
          // 将http/https替换为ws/wss
          socketUrl = API_BASE.replace(/^http/, 'ws')
        } else {
          // 开发环境默认使用5001端口
          if (import.meta.env.DEV) {
            socketUrl = 'ws://localhost:5001'
          } else {
            // 生产环境使用当前域名
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            socketUrl = `${protocol}//${window.location.host}`
          }
        }
        
        if (!socketUrl) {
          this.$message.error('无法确定WebSocket服务器地址')
          this.connecting = false
          this.loading = false
          return
        }
        
        // 关闭现有连接
        if (this.socket) {
          this.socket.disconnect()
        }
        
        // 创建新的WebSocket连接
        this.socket = io(socketUrl, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        })
        
        this.socket.on('connect', () => {
          console.log('WebSocket已连接')
          this.isConnected = true
          this.connecting = false
          this.loading = false
          this.$message.success('WebSocket连接成功')
          
          // 订阅队列更新
          this.socket.emit('subscribe_queue', { table: this.tableName })
          
          // 获取初始数据
          this.refreshData()
        })
        
        this.socket.on('disconnect', () => {
          console.log('WebSocket已断开')
          this.isConnected = false
          this.connecting = false
          this.loading = false
          this.$message.warning('WebSocket连接已断开')
        })
        
        // 监听队列URL更新
        this.socket.on('queue_urls', (data) => {
          console.log('收到队列URL更新:', data)
          this.updateQueueData(data)
        })
        
        this.socket.on('connect_error', (error) => {
          console.error('WebSocket连接错误:', error)
          this.$message.error('WebSocket连接失败: ' + error.message)
          this.isConnected = false
          this.connecting = false
          this.loading = false
        })
        
      } catch (error) {
        console.error('WebSocket连接异常:', error)
        this.$message.error('WebSocket连接异常: ' + error.message)
        this.isConnected = false
        this.connecting = false
        this.loading = false
      }
    },
    
    // 断开WebSocket连接
    disconnectWebSocket() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
      }
      this.isConnected = false
      this.queueUrls = []
      this.queueLength = 0
    },
    
    // 刷新数据
    refreshData() {
      if (!this.isConnected || !this.tableName) {
        return
      }
      
      this.loading = true
      
      // 请求获取队列URL数据
      this.socket.emit('get_queue_urls', {
        table: this.tableName,
        page: this.currentPage,
        page_size: this.pageSize
      })
    },
    
    // 更新队列数据
    updateQueueData(data) {
      if (data.table === this.tableName) {
        this.queueLength = data.total || 0
        this.queueUrls = (data.urls || []).map((url, index) => ({
          url: url,
          timestamp: Date.now()
        }))
        this.lastUpdateTime = Date.now()
        this.loading = false
      }
    },
    
    // 处理分页变化
    handlePageChange(page) {
      this.currentPage = page
      this.refreshData()
    },
    
    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return '-'
      const date = new Date(timestamp)
      return date.toLocaleString()
    }
  }
}
</script>

<style scoped>
/* 添加一些样式 */
</style>
