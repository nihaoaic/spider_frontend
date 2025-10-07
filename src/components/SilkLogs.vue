<template>
  <div>
    <el-card>
      <div slot="header">
        <span>爬虫名单日志</span>
        <el-button style="float: right; padding: 3px 0" type="text" @click="refreshLogs">刷新日志</el-button>
      </div>
      
      <el-alert
        title="功能开发中"
        type="warning"
        description="爬虫日志功能正在开发中，敬请期待。"
        show-icon>
      </el-alert>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'SpiderLogs',
  props: {
    apiHost: {
      type: String,
      default: ''
    }
  },
  methods: {
    refreshLogs() {
      this.$message.info('日志功能正在开发中')
    }
  }
}
</script>

<style scoped>
</style>
