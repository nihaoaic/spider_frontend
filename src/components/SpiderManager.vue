<template>
  <div>
    <el-card>
      <div slot="header" class="clearfix card-header-row">
        <span class="card-title">爬虫项目管理</span>
        <span class="header-actions">
          <el-button type="text" class="header-link header-link--deploy" @click="batchScrapydDeploy" :loading="deployLoading">
            拉取并批量部署
          </el-button>
          <el-button type="text" class="header-link" @click="refreshProjects" :loading="loading">
            刷新项目
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
            <div class="project-toolbar">
              <el-button type="text" class="project-action project-action--danger" @click="deleteProject(project.name)">
                删除项目
              </el-button>
              <template v-if="project.versions && project.versions.length > 0">
                <span class="toolbar-sep" aria-hidden="true">|</span>
                <el-button
                  type="text"
                  class="project-action project-action--danger"
                  :disabled="selectedVersionCount(project) === 0"
                  @click="batchDeleteSelectedVersions(project)"
                >
                  批量删除选中版本
                </el-button>
                <el-button type="text" class="project-action project-action--warn" @click="pruneKeepLatest(project)">
                  仅保留最新版本
                </el-button>
                <span v-if="selectedVersionCount(project) > 0" class="toolbar-hint">
                  已选 {{ selectedVersionCount(project) }} 个版本
                </span>
              </template>
            </div>

            <!-- 添加版本表格 -->
            <el-table
              :data="project.versions"
              row-key="version"
              class="version-table"
              style="width: 100%; margin-top: 12px;"
              v-if="project.versions && project.versions.length > 0"
              @selection-change="(rows) => onVersionSelectionChange(project.name, rows)"
              size="small"
            >
              <el-table-column type="selection" width="44" />
              <el-table-column prop="version" label="版本" width="200">
                <template #default="{ row }">
                  <span class="version-id">{{ row.version }}</span>
                </template>
              </el-table-column>

              <el-table-column label="爬虫列表" min-width="100">
                <template #default="{ row }">
                  <el-button
                    v-if="!row.spidersLoading"
                    type="text"
                    size="small"
                    class="cell-text-btn"
                    @click="loadSpidersForVersion(project.name, row.version)"
                  >
                    {{ row.spidersLoaded ? '重新加载' : '查看爬虫' }}
                  </el-button>
                  <span v-else class="cell-muted">加载中…</span>
                </template>
              </el-table-column>

              <el-table-column label="启动爬虫" min-width="280">
                <template #default="{ row }">
                  <div v-if="row.spiders && row.spiders.length > 0" class="spider-link-list">
                    <el-link
                      v-for="spider in row.spiders"
                      :key="spider"
                      type="primary"
                      :underline="false"
                      class="spider-link-item"
                      @click="runSpider(project.name, spider)"
                    >
                      {{ spider }}
                    </el-link>
                  </div>
                  <span v-else class="cell-muted">先点「查看爬虫」</span>
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
      expandedRows: [], // 记录展开的行
      /** 各项目版本表格当前勾选行 { [projectName]: row[] } */
      versionSelectionByProject: {}
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
            const projectNames = Array.isArray(data.data) ? data.data : (data.data.projects || [])
            // 初始化项目数据
            this.versionSelectionByProject = {}
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

    /** 一键：git pull（若配置 PULL_SPIDER_REPO_PATH）+ 批量 scrapyd-deploy */
    batchScrapydDeploy() {
      this.$confirm(
        '将在服务器上按 .env 执行：若配置了 PULL_SPIDER_REPO_PATH 则先 git pull，再在 SCRAPYD_DEPLOY_WORKDIR 下对各 target 执行 scrapyd-deploy（shell 模式）。是否继续？',
        '拉取并批量部署',
        { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
      ).then(() => {
        this.deployLoading = true
        const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
        const url = API ? `${API}/deploy/pull_and_scrapyd` : '/deploy/pull_and_scrapyd'
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
              const parts = []
              if (data.git && data.git.ok === true) parts.push('Git 已拉取')
              if (data.git && data.git.skipped) parts.push('未配置拉取，已跳过')
              if (data.targets && data.targets.length) {
                parts.push(`已部署: ${data.targets.join(', ')}`)
              }
              if (data.deploy && data.deploy.skipped) parts.push('未配置部署，已跳过')
              if (data.prune && typeof data.prune === 'object') {
                const lines = Object.entries(data.prune).map(([h, p]) => {
                  if (p && p.error) return `${h}: ${p.error}`
                  const nDel = (p && p.deleted && p.deleted.length) || 0
                  const kept = (p && p.kept && p.kept.join(',')) || ''
                  return `${h}: 保留 [${kept}]，已删 ${nDel} 个旧版本`
                })
                if (lines.length) parts.push('版本清理: ' + lines.join('；'))
              }
              this.$message.success(parts.length ? parts.join('；') : '操作成功')
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

    selectedVersionCount(project) {
      return (this.versionSelectionByProject[project.name] || []).length
    },

    onVersionSelectionChange(projectName, rows) {
      this.versionSelectionByProject = { ...this.versionSelectionByProject, [projectName]: rows || [] }
    },

    batchDeleteSelectedVersions(project) {
      const rows = this.versionSelectionByProject[project.name] || []
      if (!rows.length) {
        this.$message.warning('请先勾选要删除的版本')
        return
      }
      const versions = rows.map((r) => r.version)
      this.$confirm(
        `确定批量删除以下 ${versions.length} 个版本？不可恢复：\n${versions.join(', ')}`,
        '批量删除版本',
        { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
      )
        .then(() => this.performBatchDeleteVersions(project.name, versions))
        .then(() => {
          this.versionSelectionByProject = { ...this.versionSelectionByProject, [project.name]: [] }
          this.loadProjectDetails(project)
        })
        .catch((e) => {
          if (e === 'cancel') return
          this.$message.error(e && e.message ? e.message : '批量删除失败')
        })
    },

    pruneKeepLatest(project) {
      this.$confirm(
        '将删除除「最新」以外的所有历史版本（按版本号排序保留 1 个），是否继续？',
        '仅保留最新版本',
        { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
      )
        .then(() => this.performPruneVersions(project.name, 1))
        .then(() => {
          this.versionSelectionByProject = { ...this.versionSelectionByProject, [project.name]: [] }
          this.loadProjectDetails(project)
        })
        .catch((e) => {
          if (e === 'cancel') return
          this.$message.error(e && e.message ? e.message : '清理版本失败')
        })
    },

    performBatchDeleteVersions(projectName, versions) {
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const enc = encodeURIComponent(projectName)
      const baseUrl = API
        ? `${API}/scrapyd/projects/${enc}/versions/batch_delete`
        : `/scrapyd/projects/${enc}/versions/batch_delete`
      const scrapydHost = typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__ || ''
      const url = scrapydHost ? `${baseUrl}?host=${encodeURIComponent(scrapydHost)}` : baseUrl

      return this.$fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versions })
      })
        .then(async (response) => {
          let data = {}
          try {
            data = await response.json()
          } catch (_) {}
          const failed = (data.results || []).filter((r) => !r.ok)
          if (data.status === 'success') {
            this.$message.success(`已删除 ${versions.length} 个版本`)
            return
          }
          if (data.status === 'partial_success' && failed.length) {
            this.$message.warning(
              `部分失败：${failed.map((f) => `${f.version}: ${f.error || '?'}`).join('; ')}`
            )
            return
          }
          if (data.status === 'error' || !response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`)
          }
        })
    },

    performPruneVersions(projectName, keep = 1) {
      const API = typeof window !== 'undefined' && window.__API_BASE__ || import.meta.env.VITE_API || ''
      const enc = encodeURIComponent(projectName)
      const baseUrl = API
        ? `${API}/scrapyd/projects/${enc}/versions/prune`
        : `/scrapyd/projects/${enc}/versions/prune`
      const scrapydHost = typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__ || ''
      const url = scrapydHost ? `${baseUrl}?host=${encodeURIComponent(scrapydHost)}` : baseUrl

      return this.$fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep })
      })
        .then(async (response) => {
          let data = {}
          try {
            data = await response.json()
          } catch (_) {}
          if (data.status === 'success') {
            const n = (data.deleted && data.deleted.length) || 0
            this.$message.success(n ? `已清理，删除 ${n} 个旧版本` : '当前无需清理')
            return
          }
          if (data.status === 'partial_success') {
            const errs = data.errors || []
            this.$message.warning(errs.length ? errs.join('; ') : '部分清理失败')
            return
          }
          if (data.status === 'error' || !response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`)
          }
        })
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

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.card-title {
  font-size: 18px;
  font-weight: bold;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.header-link {
  padding: 4px 8px;
  font-size: 14px;
}
.header-link--deploy {
  color: #67c23a;
}

.project-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 0;
  margin-bottom: 4px;
  font-size: 13px;
}
.project-action {
  padding: 2px 8px;
}
.project-action--danger {
  color: #f56c6c;
}
.project-action--warn {
  color: #e6a23c;
}
.toolbar-sep {
  color: #dcdfe6;
  margin: 0 6px;
  user-select: none;
}
.toolbar-hint {
  color: #909399;
  font-size: 12px;
  margin-left: 8px;
}

.version-table :deep(.el-table__cell) {
  vertical-align: top;
}
.version-id {
  font-family: ui-monospace, monospace;
  font-size: 13px;
}
.cell-text-btn {
  padding: 0;
  height: auto;
  min-height: 0;
}
.cell-muted {
  color: #909399;
  font-size: 12px;
}

.spider-link-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  line-height: 1.6;
  max-width: 520px;
  max-height: 168px;
  overflow-y: auto;
  padding: 2px 0;
}
.spider-link-item {
  font-size: 13px;
}
.spider-link-item:hover {
  text-decoration: underline;
}
</style>
