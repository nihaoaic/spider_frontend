<template>
  <div>
    <el-card>
      <div slot="header" class="clearfix">
        <span style="font-size: 18px; font-weight: bold;">爬虫项目管理</span>
        <span style="float: right;">
          <el-button style="margin-right: 8px;" type="success" @click="batchScrapydDeploy" :loading="deployLoading">
            批量 scrapyd-deploy
          </el-button>
          <el-button style="padding: 8px 16px;" type="primary" @click="refreshProjects" :loading="loading">
            <i class="el-icon-refresh"></i> 刷新项目
          </el-button>
        </span>
      </div>

      <el-collapse v-model="expandedRows" @change="handleExpandChange">
        <el-collapse-item
          v-for="project in projects"
          :key="project.name"
          :name="project.name"
        >
          <template #title>
            <i class="el-icon-folder" style="color:#409EFF;margin-right:5px;"></i>
            <span style="font-weight:bold;color:#409EFF;">{{ project.name }}</span>
          </template>

          <div v-if="project.loading" style="text-align:center; padding:20px;">
            <el-loading text="加载中..." />
          </div>

          <div v-else>
            <el-button type="danger" size="small" @click="deleteProject(project.name)" style="margin-bottom:10px;">
              Delete Project
            </el-button>

            <!-- 添加版本表格 -->
            <el-table
              :data="project.versions"
              style="width: 100%; margin-top: 15px;"
              v-if="project.versions && project.versions.length > 0"
            >
              <el-table-column prop="version" label="Version" width="250">
                <template #default="{ row }">
                  <i class="el-icon-document" style="margin-right:5px;"></i>
                  {{ row.version }}
                </template>
              </el-table-column>
              
              <el-table-column label="Spider List" width="120%">
                <template #default="{ row }">
                  <el-button 
                    size="mini" 
                    type="primary" 
                    @click="loadSpidersForVersion(project.name, row.version)"
                    :loading="row.spidersLoading"
                  >
                    Spiders List
                  </el-button>
                </template>
              </el-table-column>
              
              <!-- 新增Run Spider列 -->
              <el-table-column label="Run Spider" align="center">
                <template #default="{ row }">
                  <div v-if="row.spiders && row.spiders.length > 0">
                    <el-button
                      v-for="spider in row.spiders"
                      :key="spider"
                      type="success"
                      size="mini"
                      style="margin: 2px;"
                      @click="runSpider(project.name, spider)"
                    >
                      Run Spider({{ spider }})
                    </el-button>
                  </div>
                  <div v-else>
                    <el-tag size="mini" type="info">No spiders available</el-tag>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column label="Actions" width="150" align="center">
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    size="mini"
                    @click="deleteVersion(project.name, row.version)"
                  >
                    Delete Version
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div v-if="(!project.versions || project.versions.length === 0) && !project.loading" style="text-align:center; padding:20px;">
              <el-empty description="暂无版本数据" :image-size="80"></el-empty>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <div v-if="projects.length === 0 && !loading" style="text-align:center; padding:40px;">
        <el-empty description="暂无项目数据"></el-empty>
      </div>
    </el-card>
  </div>
</template>



<script>
import { ElMessageBox } from 'element-plus'
import SpiderJobs from './SpiderJobs.vue'

export default {
  name: 'SpiderManager',
  components: { SpiderJobs },
  props: {
    apiHost: {
      type: String,
      default: ''
    }
  },
  // 使用 window.__authFetch__ 发起带 Token 的请求，兜底为普通 fetch
  computed: {
    $fetch() {
      return (typeof window !== 'undefined' && window.__authFetch__) || fetch
    }
  },
  data() {
    return {
      projects: [],
      loading: false,
      deployLoading: false,
      jobsDialogVisible: false,
      selectedSpider: '',
      selectedProjectName: '',
      expandedRows: [] // 记录展开的行
    }
  },
  mounted() {
    this.refreshProjects()
  },
  methods: {
    refreshProjects() {
      this.loading = true
      // 修复：使用window.__API_BASE__作为API基础地址
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const baseUrl = API ? `${API}/scrapyd/projects` : `/scrapyd/projects`
      // 传递主机参数给后端API
      const scrapydHost = typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__ || ''
      const url = scrapydHost ? `${baseUrl}?host=${encodeURIComponent(scrapydHost)}` : baseUrl
      
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.status === 'success') {
            // 修复：根据后端实际返回结构解析项目列表数据
            const projectNames = data.data.projects || []
            // 初始化项目数据
            this.projects = projectNames.map(name => ({ 
              name,
              versionCount: 0,
              spiderCount: 0,
              versions: [],
              loading: false
            }))
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

    /** 按服务端配置依次 scrapyd-deploy（无 git pull） */
    batchScrapydDeploy() {
      this.$confirm(
        '将在服务器上对 SCRAPYD_DEPLOY_WORKDIR 依次执行 scrapyd-deploy（各 target 见 .env 中 SCRAPYD_DEPLOY_TARGETS），不包含 git pull。是否继续？',
        '批量 scrapyd-deploy',
        { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
      ).then(() => {
        this.deployLoading = true
        const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
        const url = API ? `${API}/deploy/scrapyd` : '/deploy/scrapyd'
        this.$fetch(url, { method: 'GET' })
          .then(async r => {
            let data = {}
            try {
              data = await r.json()
            } catch (_) {}
            return { status: r.status, data }
          })
          .then(({ status, data }) => {
            if (data.status === 'success') {
              const t = (data.targets || []).length
              this.$message.success(
                t ? `已部署到 ${t} 个 target：${data.targets.join(', ')}` : '操作成功'
              )
              this.refreshProjects()
            } else if (data.status === 'partial_success') {
              this.$message.warning((data.errors || []).join('; ') || '部分 target 部署失败')
              ElMessageBox.alert(
                `<pre style="max-height:320px;overflow:auto;text-align:left;font-size:12px;">${this._escapeHtml(JSON.stringify(data, null, 2))}</pre>`,
                '部署详情',
                { dangerouslyUseHTMLString: true }
              )
              this.refreshProjects()
            } else {
              this.$message.error(data.message || `请求失败 (${status})`)
            }
          })
          .catch(e => this.$message.error(e.message || '请求失败'))
          .finally(() => { this.deployLoading = false })
      }).catch(() => {})
    },

    _escapeHtml(s) {
      if (!s) return ''
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    },

    // 处理展开行变化
    handleExpandChange(activeNames) {
      // el-collapse的change事件传递的是当前展开项name的数组
      this.expandedRows = activeNames;
      
      // 获取最新展开的项目名称
      const latestExpanded = activeNames.length > 0 ? activeNames[activeNames.length - 1] : null;
      if (latestExpanded) {
        // 查找对应的项目对象
        const project = this.projects.find(p => p.name === latestExpanded);
        if (project && (!project.versions || project.versions.length === 0)) {
          // 如果项目详情未加载，则加载该项目的版本和爬虫信息
          this.loadProjectDetails(project);
        }
      }
    },
    
    // 展开项目详情
    expandProject(row) {
      if (this.expandedRows.includes(row.name)) {
        // 如果已展开，则收起
        this.expandedRows = this.expandedRows.filter(name => name !== row.name)
      } else {
        // 如果未展开，则展开并加载数据
        this.expandedRows = [...this.expandedRows, row.name]
        this.loadProjectDetails(row)
      }
    },
    
    // 加载项目详情（版本和爬虫信息）
    loadProjectDetails(project) {
      // 查找项目在数组中的索引
      const index = this.projects.findIndex(p => p.name === project.name)
      if (index === -1) return
      
      // 设置加载状态
      this.projects[index].loading = true
      
      // 并行获取版本和爬虫信息
      Promise.all([
        this.getProjectVersions(project.name),
        this.getProjectSpiders(project.name)
      ]).then(([versions, spiders]) => {
        // 更新项目信息
        this.projects[index].versionCount = versions.length
        this.projects[index].spiderCount = spiders.length
        
        // 构造版本数据
        const versionData = versions.map(version => ({
          version: version,
          spiders: [], // 初始为空，点击加载按钮时再获取
          spidersLoaded: false,
          spidersLoading: false // 添加加载状态
        }))
        
        this.projects[index].versions = versionData
        this.projects[index].loading = false
        
        // 触发视图更新
        this.$forceUpdate()
      }).catch(error => {
        this.$message.error('加载项目详情失败: ' + error.message)
        this.projects[index].loading = false
      })
    },
    
    // 为特定版本加载爬虫列表
    loadSpidersForVersion(projectName, version) {
      const projectIndex = this.projects.findIndex(p => p.name === projectName)
      if (projectIndex === -1) return
      
      const versionIndex = this.projects[projectIndex].versions.findIndex(v => v.version === version)
      if (versionIndex === -1) return
      
      // 设置加载状态
      this.projects[projectIndex].versions[versionIndex].spidersLoaded = true
      this.projects[projectIndex].versions[versionIndex].spidersLoading = true
      
      // 获取指定版本下的爬虫
      this.getSpidersForVersion(projectName, version)
        .then(spiders => {
          this.projects[projectIndex].versions[versionIndex].spiders = spiders
          this.projects[projectIndex].versions[versionIndex].spidersLoading = false
          // 触发视图更新
          this.$forceUpdate()
        })
        .catch(error => {
          this.$message.error('获取爬虫列表失败: ' + error.message)
          this.projects[projectIndex].versions[versionIndex].spiders = []
          this.projects[projectIndex].versions[versionIndex].spidersLoading = false
        })
    },
    
    // 获取指定版本下的爬虫
    getSpidersForVersion(projectName, version) {
      return new Promise((resolve, reject) => {
        // 修复：使用window.__API_BASE__作为API基础地址
        const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
        // 使用正确的后端接口路径
        const baseUrl = API ? `${API}/scrapyd/projects/${projectName}/spiders` : `/scrapyd/projects/${projectName}/spiders`
        // 传递主机参数和版本参数给后端API
        const scrapydHost = typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__ || ''
        const params = new URLSearchParams()
        if (scrapydHost) params.append('host', scrapydHost)
        params.append('version', version)
        const url = `${baseUrl}?${params.toString()}`
        
        fetch(url)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.json()
          })
          .then(data => {
            if (data.status === 'success') {
              resolve(data.data.spiders || data.data || [])
            } else {
              reject(new Error(data.message || '获取爬虫信息失败'))
            }
          })
          .catch(error => {
            reject(error)
          })
      })
    },
    
    // 修复：正确请求后端接口获取项目版本
    getProjectVersions(projectName) {
      return new Promise((resolve, reject) => {
        // 修复：使用window.__API_BASE__作为API基础地址
        const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
        // 使用正确的后端接口路径
        const baseUrl = API ? `${API}/scrapyd/projects/${projectName}/versions` : `/scrapyd/projects/${projectName}/versions`
        // 传递主机参数给后端API
        const scrapydHost = typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__ || ''
        const url = scrapydHost ? `${baseUrl}?host=${encodeURIComponent(scrapydHost)}` : baseUrl
        
        fetch(url)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.json()
          })
          .then(data => {
            if (data.status === 'success') {
              resolve(data.data.versions || data.data || [])
            } else {
              reject(new Error(data.message || '获取版本信息失败'))
            }
          })
          .catch(error => {
            reject(error)
          })
      })
    },
    
    // 修复：正确请求后端接口获取项目爬虫
    getProjectSpiders(projectName) {
      return new Promise((resolve, reject) => {
        // 修复：使用window.__API_BASE__作为API基础地址
        const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
        // 使用正确的后端接口路径
        const baseUrl = API ? `${API}/scrapyd/projects/${projectName}/spiders` : `/scrapyd/projects/${projectName}/spiders`
        // 传递主机参数给后端API
        const scrapydHost = typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__ || ''
        const url = scrapydHost ? `${baseUrl}?host=${encodeURIComponent(scrapydHost)}` : baseUrl
        
        fetch(url)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            return response.json()
          })
          .then(data => {
            if (data.status === 'success') {
              resolve(data.data.spiders || data.data || [])
            } else {
              reject(new Error(data.message || '获取爬虫信息失败'))
            }
          })
          .catch(error => {
            reject(error)
          })
      })
    },
    
    // 删除项目
    deleteProject(projectName) {
      this.$confirm(`确定要删除项目 ${projectName} 吗？此操作不可恢复。`, '删除项目', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.performDeleteProject(projectName)
      }).catch(() => {
        // 用户取消删除
      })
    },
    
    // 执行删除项目操作
    performDeleteProject(projectName) {
      // 修复：使用window.__API_BASE__作为API基础地址
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const baseUrl = API ? `${API}/scrapyd/projects/${projectName}` : `/scrapyd/projects/${projectName}`
      // 传递主机参数给后端API
      const scrapydHost = typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__ || ''
      const url = scrapydHost ? `${baseUrl}?host=${encodeURIComponent(scrapydHost)}` : baseUrl
      
      this.$fetch(url, { method: 'DELETE' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.status === 'success') {
            this.$message.success(`项目 ${projectName} 删除成功`)
            // 重新加载项目信息
            this.refreshProjects()
          } else {
            this.$message.error(data.message || '删除项目失败')
          }
        })
        .catch(error => {
          this.$message.error('删除项目失败: ' + error.message)
        })
    },
    
    // 删除版本
    deleteVersion(projectName, version) {
      this.$confirm(`确定要删除版本 ${version} 吗？此操作不可恢复。`, '删除版本', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.performDeleteVersion(projectName, version)
      }).catch(() => {
        // 用户取消删除
      })
    },
    
    // 执行删除版本操作
    performDeleteVersion(projectName, version) {
      // 修复：使用window.__API_BASE__作为API基础地址
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const baseUrl = API ? `${API}/scrapyd/projects/${projectName}/versions/${version}` : `/scrapyd/projects/${projectName}/versions/${version}`
      // 传递主机参数给后端API
      const scrapydHost = typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__ || ''
      const url = scrapydHost ? `${baseUrl}?host=${encodeURIComponent(scrapydHost)}` : baseUrl
      
      this.$fetch(url, { method: 'DELETE' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.status === 'success') {
            this.$message.success(`版本 ${version} 删除成功`)
            // 重新加载项目信息
            this.refreshProjects()
          } else {
            this.$message.error(data.message || '删除版本失败')
          }
        })
        .catch(error => {
          this.$message.error('删除版本失败: ' + error.message)
        })
    },
    
    // 运行爬虫
    runSpider(projectName, spiderName) {
      // 修复：使用window.__API_BASE__作为API基础地址
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const baseUrl = API ? `${API}/scrapyd/projects/${projectName}/spiders/${spiderName}/run` : `/scrapyd/projects/${projectName}/spiders/${spiderName}/run`
      // 传递主机参数给后端API
      const scrapydHost = typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__ || ''
      const url = scrapydHost ? `${baseUrl}?host=${encodeURIComponent(scrapydHost)}` : baseUrl
      
      // 显示正在运行的提示
      const loading = this.$loading({
        lock: true,
        text: `正在启动爬虫 ${spiderName}...`,
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });
      
      this.$fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
        .then(response => {
          loading.close();
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.status === 'success') {
            this.$message.success(`爬虫 ${spiderName} 启动成功，任务ID: ${data.jobid.jobid}`)
          } else {
            this.$message.error(data.message || '运行爬虫失败')
          }
        })
        .catch(error => {
          // 关闭加载提示
          loading.close();
          this.$message.error('运行爬虫失败: ' + error.message)
        })
    },
    
    viewSpiderJobs(spiderName) {
      this.selectedProjectName = this.selectedProjectName || this.projects[0]?.name || ''
      this.selectedSpider = spiderName
      this.jobsDialogVisible = true
    }
  }
}
</script>

<style scoped>
.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}
.clearfix:after {
  clear: both;
}
</style>
