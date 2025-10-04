<template>
  <div>
    <el-form label-position="top">
      <el-form-item label="Script name (in mongo_scripts/)">
        <el-input v-model="script" placeholder="test.py or test.js" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="execScript" :loading="loading">执行脚本</el-button>
      </el-form-item>
      <el-alert v-if="error" :title="error" type="error" show-icon />
      <div v-if="downloadUrl" style="margin-top:12px">
        <el-link :href="downloadUrl" target="_blank">下载结果文件</el-link>
      </div>
    </el-form>
  </div>
</template>

<script>
export default {
  props: { apiHost: { type: String, default: '' } },
  data() {
    return { script: '', loading: false, downloadUrl: null, error: null }
  },
  methods: {
    async execScript() {
      this.error = null
      this.downloadUrl = null
      if (!this.script) { this.error = '请输入脚本名'; return }
      this.loading = true
      try {
        const API = this.apiHost || (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
        const res = await fetch(API ? `${API}/mongo/exec` : '/mongo/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: this.script })
        })
        if (!res.ok) {
          const err = await res.json().catch(()=>({message:'unknown error'}))
          this.error = JSON.stringify(err)
          return
        }
        // The backend returns a file; create an object URL
        const blob = await res.blob()
        this.downloadUrl = URL.createObjectURL(blob)
      } catch (e) {
        this.error = String(e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
