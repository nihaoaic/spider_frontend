<template>
  <el-drawer
    :model-value="modelValue"
    class="spider-source-drawer"
    :title="drawerTitle"
    direction="rtl"
    size="88%"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="onDrawerClosed"
  >
    <div v-loading="loading" class="drawer-inner">
      <el-alert
        v-if="hint"
        :title="hint"
        type="info"
        :closable="false"
        show-icon
        class="hint-alert"
      />
      <div v-if="error" class="err-text">{{ error }}</div>
      <template v-else-if="content !== null">
        <div class="meta-bar">
          <el-tag size="small" type="info">{{ relPath || '—' }}</el-tag>
          <span v-if="byteSize != null" class="size-hint">{{ byteSize }} 字节</span>
          <span v-if="!canSave" class="size-hint warn">只读：需管理员账号才可保存到服务器</span>
          <el-button size="small" type="primary" :disabled="!canSave" :loading="saving" @click="saveToServer">
            保存到服务器
          </el-button>
          <el-button size="small" text type="primary" @click="reload" :loading="loading">重新加载</el-button>
          <el-button size="small" text @click="copyAll">复制全部</el-button>
        </div>
        <div ref="editorMount" class="editor-mount" />
      </template>
    </div>
  </el-drawer>
</template>

<script>
import { EditorView, basicSetup } from 'codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'SpiderSourceDrawer',
  props: {
    modelValue: { type: Boolean, default: false },
    project: { type: String, default: '' },
    spider: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      loading: false,
      error: '',
      hint: '',
      content: null,
      relPath: '',
      byteSize: null,
      view: null,
      canSave: true,
      saving: false,
    }
  },
  computed: {
    drawerTitle() {
      if (!this.spider) return '爬虫源码'
      return `源码 — ${this.spider}`
    },
    /** 合并监听，避免打开时多次请求 */
    loadKey() {
      return this.modelValue ? `${this.project}\0${this.spider}` : ''
    },
  },
  watch: {
    loadKey(key) {
      if (key && this.project && this.spider) {
        this.$nextTick(() => this.loadAndMount())
      }
    },
  },
  beforeUnmount() {
    this.destroyEditor()
  },
  methods: {
    authFetch() {
      return (typeof window !== 'undefined' && window.__authFetch__) || fetch
    },
    apiBase() {
      return (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
    },

    onDrawerClosed() {
      this.destroyEditor()
      this.content = null
      this.error = ''
      this.hint = ''
      this.relPath = ''
      this.byteSize = null
      this.canSave = true
      this.saving = false
    },

    destroyEditor() {
      if (this.view) {
        this.view.destroy()
        this.view = null
      }
    },

    async loadAndMount() {
      this.destroyEditor()
      this.error = ''
      this.hint = ''
      this.content = null
      this.relPath = ''
      this.byteSize = null
      this.canSave = true

      const proj = this.project
      const sp = this.spider
      if (!proj || !sp) return

      this.loading = true
      try {
        const enc = (s) => encodeURIComponent(s)
        const url = `${this.apiBase()}/scrapyd/projects/${enc(proj)}/spiders/${enc(sp)}/source`
        const res = await this.authFetch()(url)
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.status !== 'success') {
          this.error = data.message || `加载失败 (${res.status})`
          this.hint =
            '服务端需在磁盘上能访问到爬虫 .py：配置 SPIDER_SOURCE_ROOT，或使用 SCRAPYD_DEPLOY_WORKDIR / PULL_SPIDER_REPO_PATH 指向含 spiders/ 的目录。'
          return
        }
        this.content = data.content ?? ''
        this.relPath = data.path || ''
        this.byteSize = data.size
        this.canSave = data.can_save !== false
        await this.$nextTick()
        this.mountEditor(this.content)
      } catch (e) {
        this.error = e.message || String(e)
        this.hint =
          '请确认已登录且后端已配置源码目录；本功能从服务器文件系统读取，不从 Scrapyd egg 解压。'
      } finally {
        this.loading = false
      }
    },

    async reload() {
      if (!this.modelValue) return
      await this.loadAndMount()
    },

    mountEditor(doc) {
      const el = this.$refs.editorMount
      if (!el) return
      this.destroyEditor()
      this.view = new EditorView({
        doc,
        extensions: [
          basicSetup,
          python(),
          oneDark,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { minHeight: 'calc(100vh - 220px)' },
          }),
        ],
        parent: el,
      })
    },

    async copyAll() {
      const text = this.view ? this.view.state.doc.toString() : this.content
      if (text == null) return
      try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('已复制')
      } catch (_) {
        ElMessage.warning('复制失败')
      }
    },

    async saveToServer() {
      if (!this.canSave) {
        ElMessage.warning('当前账号无保存权限')
        return
      }
      const proj = this.project
      const sp = this.spider
      if (!proj || !sp) return
      const text = this.view ? this.view.state.doc.toString() : this.content
      if (text == null) return
      try {
        await ElMessageBox.confirm('将覆盖服务器上的该 .py 文件（若允许新建则可能创建文件）。是否继续？', '保存到服务器', {
          type: 'warning',
          confirmButtonText: '保存',
          cancelButtonText: '取消',
        })
      } catch {
        return
      }
      this.saving = true
      try {
        const enc = (s) => encodeURIComponent(s)
        const url = `${this.apiBase()}/scrapyd/projects/${enc(proj)}/spiders/${enc(sp)}/source`
        const res = await this.authFetch()(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.status === 403) {
          ElMessage.error(data.message || '无保存权限（需管理员）')
          return
        }
        if (!res.ok || data.status !== 'success') {
          ElMessage.error(data.message || `保存失败 (${res.status})`)
          return
        }
        this.relPath = data.path || this.relPath
        this.byteSize = data.size != null ? data.size : new TextEncoder().encode(text).length
        ElMessage.success(data.message || '已保存')
      } catch (e) {
        ElMessage.error(e.message || String(e))
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style scoped>
.drawer-inner {
  min-height: 200px;
}
.hint-alert {
  margin-bottom: 12px;
}
.err-text {
  color: #f56c6c;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 8px;
}
.meta-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.size-hint {
  font-size: 12px;
  color: #909399;
}
.size-hint.warn {
  color: #e6a23c;
}
.editor-mount {
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  overflow: hidden;
  min-height: 400px;
}
.editor-mount :deep(.cm-editor) {
  min-height: 400px;
}
</style>

<style>
.spider-source-drawer .el-drawer__body {
  padding: 12px 16px 20px;
}
</style>
