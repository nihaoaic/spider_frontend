<template>
  <div class="python-pad">
    <el-card shadow="never" class="pad-card">
      <template #header>
        <div class="pad-header">
          <span class="pad-title">Python 草稿本</span>
          <span class="pad-sub">语法高亮 · 仅浏览器本地保存，不会自动在服务器执行</span>
        </div>
      </template>

      <div class="toolbar">
        <el-button type="primary" size="small" @click="saveDraft">保存到本地</el-button>
        <el-button size="small" @click="copyAll">复制全部</el-button>
        <el-button size="small" @click="downloadPy">下载 .py</el-button>
        <el-button size="small" type="danger" plain @click="clearEditor">清空</el-button>
        <span class="hint">快捷键与常见编辑器类似（Ctrl+Z 撤销、Ctrl+F 搜索）</span>
      </div>

      <div ref="editorHost" class="editor-host" />

      <el-alert
        class="foot-hint"
        type="info"
        :closable="false"
        show-icon
      >
        可将代码保存为服务器 <code>mongo_scripts/</code> 下的文件后，在「Mongo 脚本」里填写文件名执行。
      </el-alert>
    </el-card>
  </div>
</template>

<script>
import { EditorView, basicSetup } from 'codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { ElMessage } from 'element-plus'

const STORAGE_KEY = 'spider_python_pad_v1'

const DEFAULT_DOC = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地草稿：可随意编写 Python 片段。
内容仅保存在本浏览器（localStorage），不会在服务器运行。
"""

def main():
    print("Hello from Spider Server pad")


if __name__ == "__main__":
    main()
`

export default {
  name: 'PythonPad',
  data() {
    return {
      view: null,
    }
  },
  mounted() {
    this.initEditor()
  },
  beforeUnmount() {
    this.persistToStorage()
    if (this.view) {
      this.view.destroy()
      this.view = null
    }
  },
  methods: {
    loadInitialDoc() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw != null && raw !== '') return raw
      } catch (_) {}
      return DEFAULT_DOC
    },

    persistToStorage() {
      if (!this.view) return
      try {
        const text = this.view.state.doc.toString()
        localStorage.setItem(STORAGE_KEY, text)
      } catch (_) {}
    },

    initEditor() {
      const parent = this.$refs.editorHost
      if (!parent) return

      this.view = new EditorView({
        doc: this.loadInitialDoc(),
        extensions: [
          basicSetup,
          python(),
          oneDark,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { minHeight: '480px' },
          }),
        ],
        parent,
      })
    },

    saveDraft() {
      this.persistToStorage()
      ElMessage.success('已保存到浏览器本地')
    },

    async copyAll() {
      if (!this.view) return
      const text = this.view.state.doc.toString()
      try {
        await navigator.clipboard.writeText(text)
        ElMessage.success('已复制到剪贴板')
      } catch (_) {
        ElMessage.warning('复制失败，请手动全选复制')
      }
    },

    downloadPy() {
      if (!this.view) return
      const text = this.view.state.doc.toString()
      const blob = new Blob([text], { type: 'text/x-python;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `spider_pad_${new Date().toISOString().slice(0, 10)}.py`
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('已开始下载')
    },

    clearEditor() {
      if (!this.view) return
      this.view.dispatch({
        changes: { from: 0, to: this.view.state.doc.length, insert: '' },
      })
      this.persistToStorage()
      ElMessage.info('已清空')
    },
  },
}
</script>

<style scoped>
.python-pad {
  max-width: 1200px;
  margin: 0 auto;
}
.pad-card {
  border-radius: 10px;
}
.pad-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pad-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.pad-sub {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.toolbar .hint {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.editor-host {
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  overflow: hidden;
  min-height: 480px;
  height: min(62vh, 720px);
  margin-bottom: 12px;
}

.editor-host :deep(.cm-editor) {
  height: 100%;
}
.editor-host :deep(.cm-scroller) {
  min-height: 480px;
}

.foot-hint {
  font-size: 13px;
}
.foot-hint code {
  padding: 1px 6px;
  background: #f4f4f5;
  border-radius: 4px;
  font-size: 12px;
}
</style>
