<template>
  <div>
    <el-form :model="form" :rules="rules" ref="redisForm" label-width="120px">
      <el-form-item label="目标表名" prop="table">
        <el-input v-model="form.table" placeholder="请输入目标表名"></el-input>
      </el-form-item>
      
      <el-form-item label="URL来源" prop="sourceType">
        <el-radio-group v-model="form.sourceType">
          <el-radio label="manual">手动输入</el-radio>
          <el-radio label="file">上传文件</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item v-if="form.sourceType === 'manual'" label="URL列表" prop="urls">
        <el-input 
          type="textarea" 
          v-model="form.urls" 
          placeholder="请输入URL，每行一个"
          :rows="6"
        ></el-input>
      </el-form-item>
      
      <el-form-item v-if="form.sourceType === 'file'" label="上传文件" prop="file">
        <el-upload
          class="upload-demo"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :file-list="fileList"
          :limit="1"
          :on-exceed="handleExceed"
        >
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
          <div class="el-upload__tip" slot="tip">
            文件大小不能超过10MB
          </div>
        </el-upload>
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="submitForm" :loading="submitting">开始推送</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>
    
    <!-- 进度显示 -->
    <div v-if="taskId">
      <el-divider>推送进度</el-divider>
      <TaskProgress :task-id="taskId" :api-host="apiHost" @completed="onTaskCompleted" />
    </div>
  </div>
</template>

<script>
import TaskProgress from './TaskProgress.vue'

export default {
  name: 'RedisPush',
  components: { TaskProgress },
  props: {
    apiHost: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      form: {
        table: '',
        sourceType: 'manual',
        urls: '',
        file: null
      },
      fileList: [],
      submitting: false,
      taskId: ''
    }
  },
  computed: {
    apiUrl() {
      let base = typeof window !== 'undefined' ? window.__API_BASE__ : '' || import.meta.env.VITE_API || ''
      
      if (!base) {
        if (import.meta.env.DEV) {
          base = 'http://localhost:5001'
        }
      }
      
      return base
    },
    rules() {
      return {
        table: [
          { required: true, message: '请输入目标表名', trigger: 'blur' }
        ],
        urls: [
          { required: true, message: '请输入URL列表', trigger: 'blur' },
          { validator: this.validateUrls, trigger: 'blur' }
        ],
        file: [
          { required: true, message: '请上传文件', trigger: 'change' }
        ]
      }
    }
  },
  methods: {
    validateUrls(rule, value, callback) {
      if (this.form.sourceType === 'manual' && (!value || value.trim() === '')) {
        callback(new Error('请输入URL列表'))
      } else if (this.form.sourceType === 'manual') {
        const urls = value.split('\n').filter(url => url.trim() !== '')
        if (urls.length === 0) {
          callback(new Error('请输入有效的URL'))
        } else {
          const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
          const invalidUrls = urls.filter(url => !urlPattern.test(url.trim()))
          if (invalidUrls.length > 0) {
            callback(new Error('存在无效的URL格式'))
          } else {
            callback()
          }
        }
      } else {
        callback()
      }
    },
    handleFileChange(file, fileList) {
      const isLt10M = file.size / 1024 / 1024 < 10
      
      if (!isLt10M) {
        this.$message.error('文件大小不能超过10MB!')
        this.fileList = []
        this.form.file = null
        return false
      }
      
      this.fileList = fileList
      this.form.file = file.raw
    },
    handleExceed(files, fileList) {
      this.$message.warning('只能上传一个文件')
    },
    submitForm() {
      this.$refs.redisForm.validate((valid) => {
        if (valid) {
          this.startPush()
        } else {
          return false
        }
      })
    },
    startPush() {
      this.submitting = true
      
      let baseUrl = this.apiUrl
      const path = '/redis/push'
      let fullUrl
      
      if (baseUrl) {
        baseUrl = baseUrl.replace(/\/$/, '')
        fullUrl = `${baseUrl}${path}`
      } else {
        fullUrl = path
      }
      
      const formData = new FormData()
      formData.append('table', this.form.table)
      
      if (this.form.sourceType === 'manual') {
        const urls = this.form.urls.split('\n').map(url => url.trim()).filter(url => url !== '')
        const blob = new Blob([urls.join('\n')], { type: 'text/plain' })
        formData.append('file', blob, 'urls.txt')
      } else if (this.form.sourceType === 'file' && this.form.file) {
        formData.append('file', this.form.file)
      } else {
        this.$message.error('请提供有效的URL来源')
        this.submitting = false
        return
      }
      
      fetch(fullUrl, {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            return response.text().then(text => {
              throw new Error(`Received non-JSON response from server. Content: ${text.substring(0, 200)}...`)
            })
          }
          
          return response.json()
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.error)
          }
          if (data.task_id) {
            this.taskId = data.task_id
            this.$message.success('推送任务已启动')
          } else {
            throw new Error('服务器未返回任务ID')
          }
        })
        .catch(error => {
          this.$message.error('推送失败: ' + error.message)
        })
        .finally(() => {
          this.submitting = false
        })
    },
    resetForm() {
      this.$refs.redisForm.resetFields()
      this.fileList = []
      this.form.file = null
      this.taskId = ''
    },
    onTaskCompleted() {
      this.taskId = ''
    }
  }
}
</script>

<style scoped>
.upload-demo {
  width: 100%;
}
</style>