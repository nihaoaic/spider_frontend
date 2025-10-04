<template>
  <div>
    <el-table :data="files" style="width: 100%" v-loading="loading">
      <el-table-column prop="name" label="文件名" width="300"></el-table-column>
      <el-table-column prop="size" label="大小" width="150">
        <template #default="scope">
          {{ formatFileSize(scope.row.size) }}
        </template>
      </el-table-column>
      <el-table-column prop="modified" label="修改时间" width="200">
        <template #default="scope">
          {{ formatDateTime(scope.row.modified) }}
        </template>
      </el-table-column>
      <el-table-column label="操作">
        <template #default="scope">
          <el-button size="mini" @click="downloadFile(scope.row.name)">下载</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 分页控件 -->
    <el-pagination
      v-if="total > 0"
      @current-change="handlePageChange"
      @size-change="handleSizeChange"
      :current-page="currentPage"
      :page-sizes="[10, 20, 50, 100]"
      :page-size="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top: 20px; text-align: center;"
    >
    </el-pagination>
    
    <el-alert v-if="error" :title="error" type="error" show-icon style="margin-top: 20px;" />
  </div>
</template>

<script>
export default {
  props: { apiHost: { type: String, default: '' } },
  data() {
    return {
      files: [],
      loading: false,
      error: null,
      currentPage: 1,
      pageSize: 10,
      total: 0
    }
  },
  mounted() {
    this.loadFiles()
  },
  methods: {
    async loadFiles() {
      this.error = null
      this.loading = true
      try {
        const API = this.apiHost || (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
        const res = await fetch(
          `${API ? `${API}/mongo/results` : '/mongo/results'}?page=${this.currentPage}&page_size=${this.pageSize}`
        )
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data = await res.json()
        this.files = data.files || []
        this.total = data.total || 0
      } catch (err) {
        this.error = err.message || '获取文件列表失败'
        console.error('Failed to load files:', err)
      } finally {
        this.loading = false
      }
    },
    handlePageChange(page) {
      this.currentPage = page
      this.loadFiles()
    },
    // 新增方法：处理每页显示条数变化
    handleSizeChange(size) {
      this.pageSize = size
      this.currentPage = 1 // 重置到第一页
      this.loadFiles()
    },
    downloadFile(filename) {
      const API = this.apiHost || (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
      const url = API ? `${API}/mongo/results/${filename}` : `/mongo/results/${filename}`
      // 创建一个隐藏的下载链接并触发下载
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    formatDateTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
.panel {
  background: white;
  padding: 20px;
  border-radius: 6px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>
