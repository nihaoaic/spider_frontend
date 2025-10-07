<template>
  <div>
    <el-card>
      <div slot="header">
        <span>项目 "{{ project }}" - 爬虫 "{{ spider }}" 的任务</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshJobs">刷新</el-button>
      </div>
      
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <el-tab-pane label="待处理" name="pending">
          <el-table :data="pendingJobs" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="任务ID" width="300"></el-table-column>
            <el-table-column prop="spider" label="爬虫"></el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="运行中" name="running">
          <el-table :data="runningJobs" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="任务ID" width="300"></el-table-column>
            <el-table-column prop="spider" label="爬虫"></el-table-column>
            <el-table-column prop="start_time" label="开始时间"></el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="已完成" name="finished">
          <el-table :data="finishedJobs" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="任务ID" width="300"></el-table-column>
            <el-table-column prop="spider" label="爬虫"></el-table-column>
            <el-table-column prop="start_time" label="开始时间"></el-table-column>
            <el-table-column prop="end_time" label="结束时间"></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'SpiderJobs',
  props: {
    project: {
      type: String,
      required: true
    },
    spider: {
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
      activeTab: 'running',
      pendingJobs: [],
      runningJobs: [],
      finishedJobs: [],
      loading: false
    }
  },
  mounted() {
    this.refreshJobs()
  },
  methods: {
    refreshJobs() {
      this.loading = true
      const API = this.apiHost || (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
      const url = API ? `${API}/scrapyd/projects/${this.project}/jobs` : `/scrapyd/projects/${this.project}/jobs`
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.status === 'success') {
            const jobs = data.data || {}
            this.pendingJobs = jobs.pending || []
            this.runningJobs = jobs.running || []
            this.finishedJobs = jobs.finished || []
          } else {
            this.$message.error(data.message || '获取任务列表失败')
          }
          this.loading = false
        })
        .catch(error => {
          this.$message.error('获取任务列表失败: ' + error.message)
          this.loading = false
        })
    },
    
    handleTabClick(tab) {
      // 可以在这里添加切换标签页时的逻辑
    }
  },
  watch: {
    project() {
      this.refreshJobs()
    },
    spider() {
      this.refreshJobs()
    }
  }
}
</script>

<style scoped>
/* 可以添加一些样式 */
</style>
