<template>
  <div>
    <el-form label-position="top">
        <el-form-item label="Table 名称">
          <el-input v-model="key" placeholder="quotes" />
        </el-form-item>

      <el-form-item label="单条推送">
        <el-input v-model="value" placeholder="单条推送（优先）" />
        <el-button class="action-btn" type="primary" @click="pushValue" :loading="loading">推送单条</el-button>
      </el-form-item>

      <el-divider></el-divider>

      <el-form-item label="文件上传（每行一个值）">
        <div class="upload-row">
          <div :class="['upload-drop-wrapper', { 'is-dragover': dragOver }]" @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave" @drop.prevent="onDrop">
          <el-upload
            class="upload-area"
            :limit="1"
            :before-upload="beforeUpload"
            :auto-upload="false"
            ref="uploader"
            :show-file-list="false"
            @remove="handleRemove"
            @change="onUploadChange"
            @error="onUploadError"
          >
            <div class="upload-drag-content">
              <i class="el-icon-upload" style="font-size:28px; color:#409EFF;"></i>
              <p v-if="!file">将文件拖到此处，或点击“选取文件”</p>
              <p v-else class="selected-file">{{ file.name }}</p>
            </div>
          </el-upload>
          </div>
          <div class="upload-actions">
            <input ref="fileInput" type="file" style="display:none" @change="onFileChange" />
            <el-button class="action-btn" type="primary" @click="triggerSelect">选取文件</el-button>
            <el-button class="action-btn" type="primary" @click="uploadFile" :loading="loading">上传并推送</el-button>
          </div>
        </div>
      </el-form-item>

      <div v-if="result">
        <el-alert :title="`redis_key: ${result.result ? result.result.redis_key : (result.redis_key || result.data?.redis_key)}\npushed: ${result.result ? result.result.total_pushed : (result.total_pushed || result.data?.total_pushed)}`" type="success" show-icon />
        <el-alert v-if="result.error" :title="result.error" type="error" show-icon />
      </div>
      <el-alert v-if="error" :title="error" type="error" show-icon />
    </el-form>
  </div>
</template>

<script>
export default {
  props: {
    apiHost: { type: String, default: '' }
  },
  data() {
    return {
      key: 'quotes',
      value: '',
      file: null,
      dragOver: false,
      loading: false,
      result: null,
      error: null
    }
  },
  methods: {
    onFileChange(e) {
      const f = e && e.target && e.target.files ? e.target.files[0] : null
      // some upload events pass file directly
      this.file = f || (Array.isArray(e) ? e[0] : e)
    },
    beforeUpload(file) {
      console.debug('beforeUpload called', file)
      // file may be a File or an object depending on source
      this.file = file && file.raw ? file.raw : file
      return false
    },
    onUploadChange(file, fileList) {
      console.debug('el-upload change', file, fileList)
      // file may be an object with raw property when using el-upload
      const f = file && (file.raw || file) || null
      this.file = f
    },
    onUploadError(err, file, fileList) {
      console.error('el-upload error', err, file, fileList)
    },
    triggerSelect() {
      // Prefer opening el-upload's internal input so Element Plus keeps its internal state
      try {
        const uploader = this.$refs.uploader
        if (uploader && uploader.$el) {
          const elInput = uploader.$el.querySelector('input[type=file]')
          if (elInput) { elInput.click(); return }
        }
      } catch (e) {
        // continue to fallback
      }
      const input = this.$refs.fileInput
      if (input && input.click) input.click()
    },
    handleRemove() {
      this.file = null
    },
    onDragOver(e) {
      this.dragOver = true
    },
    onDragLeave(e) {
      this.dragOver = false
    },
    onDrop(e) {
      this.dragOver = false
      try {
        const files = e && e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : null
        if (files && files.length) {
          this.file = files[0]
          console.debug('file dropped', this.file)
        }
      } catch (err) {
        console.error('drop error', err)
      }
    },
    async pushValue() {
      this.error = null
      this.result = null
      if (!this.value) {
        this.error = '请输入 value'
        return
      }
      this.loading = true
      try {
        // priority: apiHost prop > window override > VITE_API > proxy
        const API = this.apiHost || (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
        const res = await fetch(API ? `${API}/redis/push` : '/redis/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: this.key, value: this.value })
        })
        const j = await res.json()
        this.result = j.result ? j : { result: j }
      } catch (e) {
        this.error = String(e)
      } finally {
        this.loading = false
      }
    },
    async uploadFile() {
      this.error = null
      this.result = null
      if (!this.file) { this.error = '请选择文件'; return }
      this.loading = true
      const form = new FormData()
      form.append('file', this.file)
      form.append('table', this.key)
      try {
        const API = this.apiHost || (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
        const res = await fetch(API ? `${API}/redis/push` : '/redis/push', { method: 'POST', body: form })
        const j = await res.json()
        this.result = j.result ? j : { result: j }
      } catch (e) {
        this.error = String(e)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
