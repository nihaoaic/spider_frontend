<template>
  <div class="stats-wrap">
    <!-- 顶部工具栏 -->
    <div class="stats-toolbar">
      <span class="stats-title">爬虫监控统计</span>
      <div class="toolbar-right">
        <el-switch
          v-model="liveStats"
          size="small"
          active-text="实时更新"
          inactive-text="手动"
          style="margin-right: 12px;"
          @change="onLiveStatsToggle"
        />
        <span v-if="liveStats && statsLastPushAt" class="live-push-hint">
          已推送 {{ statsLastPushAt }}<template v-if="statsWsSeq"> · #{{ statsWsSeq }}</template>
        </span>
        <el-select v-model="timeRange" size="small" style="width:120px;margin-left:8px;" @change="onTimeRangeChange">
          <el-option label="最近 7 天"  :value="7" />
          <el-option label="最近 14 天" :value="14" />
          <el-option label="最近 30 天" :value="30" />
        </el-select>
        <el-button type="text" size="small" :loading="loading" @click="fetchAll" style="margin-left:8px;">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="liveStats && statsWsError"
      :title="statsWsError"
      type="warning"
      :closable="false"
      show-icon
      class="stats-ws-alert"
    />

    <div v-loading="loading">
      <!-- KPI 卡片 -->
      <el-row :gutter="12" class="kpi-row">
        <el-col :span="5" v-for="kpi in kpiCards" :key="kpi.label">
          <div class="kpi-card" :style="{ borderTop: `4px solid ${kpi.color}` }">
            <div class="kpi-value" :style="{ color: kpi.color }">{{ kpi.value }}</div>
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-sub" v-if="kpi.sub">{{ kpi.sub }}</div>
          </div>
        </el-col>
      </el-row>

      <!-- 图表区 第一行 -->
      <el-row :gutter="16" style="margin-top:16px;">
        <!-- 状态饼图 -->
        <el-col :span="8">
          <el-card shadow="never" class="chart-card">
            <template #header><span class="card-title">任务状态分布</span></template>
            <div ref="pieRef" class="chart-box" />
          </el-card>
        </el-col>

        <!-- 各爬虫执行次数柱状图 -->
        <el-col :span="16">
          <el-card shadow="never" class="chart-card">
            <template #header><span class="card-title">各爬虫执行次数（Top 10）</span></template>
            <div ref="barSpiderRef" class="chart-box" />
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表区 第二行：抓取成功 vs 放弃 -->
      <el-row :gutter="16" style="margin-top:16px;">
        <el-col :span="24">
          <el-card shadow="never" class="chart-card">
            <template #header>
              <span class="card-title">各爬虫抓取详情 — 成功入库 vs 放弃 URL（Top 10）</span>
              <el-tooltip content="数据来源：SpiderServerReporter Extension 上报（需爬虫安装扩展后才有数据）" placement="top">
                <el-icon style="margin-left:6px;color:#909399;cursor:help"><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
            <div ref="barItemRef" class="chart-box" />
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表区 第三行 -->
      <el-row :gutter="16" style="margin-top:16px;">
        <!-- 趋势折线图 -->
        <el-col :span="16">
          <el-card shadow="never" class="chart-card">
            <template #header><span class="card-title">执行趋势（近 {{ timeRange }} 天）</span></template>
            <div ref="lineRef" class="chart-box-tall" />
          </el-card>
        </el-col>

        <!-- 项目分布 -->
        <el-col :span="8">
          <el-card shadow="never" class="chart-card">
            <template #header><span class="card-title">项目任务分布</span></template>
            <div ref="barProjRef" class="chart-box-tall" />
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { io } from 'socket.io-client'
import { Refresh, InfoFilled } from '@element-plus/icons-vue'
import { getToken } from '../utils/auth.js'

const COLORS = {
  finished:  '#67C23A',
  cancelled: '#F56C6C',
  running:   '#409EFF',
  pending:   '#E6A23C',
}

export default {
  name: 'SpiderStats',
  components: { Refresh, InfoFilled },
  props: {
    apiHost: { type: String, default: '' },
  },
  data() {
    return {
      loading: false,
      timeRange: 14,
      overview: null,
      timeline: [],
      charts: {},
      liveStats: true,
      statsSocket: null,
      statsLastPushAt: '',
      statsWsSeq: 0,
      statsWsError: '',
    }
  },
  watch: {
    apiHost() {
      this.fetchAll()
      this.restartStatsWs()
    },
  },
  computed: {
    kpiCards() {
      if (!this.overview) return []
      const o = this.overview
      const fmt = n => n >= 10000 ? (n / 10000).toFixed(1) + '万' : n
      return [
        { label: '总任务数',      value: o.total,               color: '#409EFF', sub: `运行中 ${o.running} · 等待中 ${o.pending}` },
        { label: '已完成任务',    value: o.finished,             color: '#67C23A', sub: `平均耗时 ${o.avg_duration}s` },
        { label: '成功入库条数',  value: fmt(o.item_scraped || 0), color: '#9C27B0', sub: `丢弃 ${fmt(o.item_dropped || 0)} 条` },
        { label: '放弃 URL 数',  value: fmt(o.failed_urls || 0),  color: '#F56C6C', sub: `总请求 ${fmt(o.total_requests || 0)}` },
        { label: '任务成功率',    value: (o.success_rate || 0) + '%', color: (o.success_rate || 0) >= 80 ? '#67C23A' : '#E6A23C', sub: `已取消 ${o.cancelled}` },
      ]
    },
  },
  async mounted() {
    await this.fetchAll()
    if (this.liveStats) this.startStatsWs()
    window.addEventListener('resize', this.resizeCharts)
  },
  beforeUnmount() {
    this.stopStatsWs()
    window.removeEventListener('resize', this.resizeCharts)
    Object.values(this.charts).forEach(c => c && c.dispose())
  },
  methods: {
    base() {
      return (typeof window !== 'undefined' && window.__API_BASE__) || import.meta.env.VITE_API || ''
    },
    hostParam() {
      const h = this.apiHost || (typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__) || ''
      return h ? `?host=${encodeURIComponent(h)}` : ''
    },

    scrapydHostForWs() {
      return this.apiHost || (typeof window !== 'undefined' && window.__SCRAPYD_SELECTED_HOST__) || ''
    },

    onTimeRangeChange() {
      this.fetchAll()
      this.restartStatsWs()
    },

    onLiveStatsToggle() {
      if (this.liveStats) this.startStatsWs()
      else this.stopStatsWs()
    },

    stopStatsWs() {
      if (this.statsSocket) {
        try {
          this.statsSocket.emit('unsubscribe_spider_stats')
        } catch (_) {}
        this.statsSocket.disconnect()
        this.statsSocket = null
      }
      this.statsWsError = ''
    },

    restartStatsWs() {
      if (!this.liveStats) return
      this.stopStatsWs()
      this.startStatsWs()
    },

    startStatsWs() {
      if (!this.liveStats) return
      this.stopStatsWs()
      const base = this.base() || 'http://127.0.0.1:5001'
      try {
        this.statsSocket = io(base, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
          timeout: 15000,
          forceNew: true,
        })
        const sub = () => {
          this.statsSocket.emit('subscribe_spider_stats', {
            host: this.scrapydHostForWs(),
            days: this.timeRange,
            token: getToken(),
          })
        }
        this.statsSocket.on('connect', sub)
        this.statsSocket.on('reconnect', sub)
        this.statsSocket.on('spider_stats_data', (data) => this.applyStatsPayload(data))
        this.statsSocket.on('connect_error', (err) => {
          this.statsWsError = (err && err.message) || 'WebSocket 连接失败'
        })
      } catch (e) {
        this.statsWsError = (e && e.message) || 'WebSocket 初始化失败'
      }
    },

    applyStatsPayload(data) {
      if (!data) return
      if (data.error) {
        this.statsWsError = data.error
        if (data.seq != null) this.statsWsSeq = data.seq
        return
      }
      this.statsWsError = ''
      this.overview = data.overview
      this._spiderCounts = data.spider_counts || []
      this._projectCounts = data.project_counts || []
      this.timeline = data.timeline || []
      if (data.seq != null) this.statsWsSeq = data.seq
      if (data.at) this.statsLastPushAt = new Date(data.at * 1000).toLocaleTimeString()
      this.$nextTick(() => this.renderAll())
    },

    async fetchAll() {
      this.loading = true
      try {
        await Promise.all([this.fetchOverview(), this.fetchTimeline()])
        await this.$nextTick()
        this.renderAll()
      } finally {
        this.loading = false
      }
    },

    async fetchOverview() {
      const res = await fetch(`${this.base()}/stats/overview${this.hostParam()}`)
      const data = await res.json()
      if (data.status === 'success') {
        this.overview = data.overview
        this._spiderCounts = data.spider_counts || []
        this._projectCounts = data.project_counts || []
      }
    },

    async fetchTimeline() {
      const res = await fetch(`${this.base()}/stats/timeline?days=${this.timeRange}`)
      const data = await res.json()
      if (data.status === 'success') this.timeline = data.timeline || []
    },

    // ── 渲染所有图表 ──
    renderAll() {
      this.renderPie()
      this.renderBarSpider()
      this.renderBarItem()
      this.renderLine()
      this.renderBarProj()
    },

    /** 复用 ECharts 实例，避免实时推送时反复 dispose 闪烁 */
    ensureChart(refName) {
      const el = this.$refs[refName]
      if (!el) return null
      if (this.charts[refName]) return this.charts[refName]
      this.charts[refName] = echarts.init(el)
      return this.charts[refName]
    },

    renderPie() {
      const chart = this.ensureChart('pieRef')
      if (!chart || !this.overview) return
      const o = this.overview
      chart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { bottom: 0, itemWidth: 12 },
        series: [{
          type: 'pie',
          radius: ['40%', '68%'],
          center: ['50%', '45%'],
          label: { show: false },
          data: [
            { value: o.finished,  name: '已完成',  itemStyle: { color: COLORS.finished } },
            { value: o.cancelled, name: '已取消',  itemStyle: { color: COLORS.cancelled } },
            { value: o.running,   name: '运行中',  itemStyle: { color: COLORS.running } },
            { value: o.pending,   name: '等待中',  itemStyle: { color: COLORS.pending } },
          ].filter(d => d.value > 0),
        }],
      })
    },

    renderBarSpider() {
      const chart = this.ensureChart('barSpiderRef')
      if (!chart) return
      const data = (this._spiderCounts || []).slice(0, 10)
      const names = data.map(d => d.name)
      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['已完成', '已取消'], top: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: {
          type: 'category', data: names,
          axisLabel: { rotate: names.some(n => n.length > 8) ? 30 : 0, fontSize: 11 },
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [
          {
            name: '已完成', type: 'bar', stack: 'total',
            itemStyle: { color: COLORS.finished },
            data: data.map(d => d.finished),
          },
          {
            name: '已取消', type: 'bar', stack: 'total',
            itemStyle: { color: COLORS.cancelled },
            data: data.map(d => d.cancelled),
          },
        ],
      })
    },

    renderBarItem() {
      const chart = this.ensureChart('barItemRef')
      if (!chart) return
      const data = (this._spiderCounts || []).slice(0, 10)
      const names = data.map(d => d.name)
      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['成功入库', '放弃URL'], top: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: {
          type: 'category', data: names,
          axisLabel: { rotate: names.some(n => n.length > 8) ? 30 : 0, fontSize: 11 },
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [
          {
            name: '成功入库', type: 'bar',
            itemStyle: { color: '#9C27B0' },
            label: { show: true, position: 'top', fontSize: 10 },
            data: data.map(d => d.item_scraped || 0),
          },
          {
            name: '放弃URL', type: 'bar',
            itemStyle: { color: COLORS.cancelled },
            label: { show: true, position: 'top', fontSize: 10 },
            data: data.map(d => d.failed_urls || 0),
          },
        ],
      })
    },

    renderLine() {
      const chart = this.ensureChart('lineRef')
      if (!chart) return
      const dates       = this.timeline.map(d => d.date.slice(5))
      const finished    = this.timeline.map(d => d.finished)
      const cancelled   = this.timeline.map(d => d.cancelled)
      const itemScraped = this.timeline.map(d => d.item_scraped || 0)
      const failedUrls  = this.timeline.map(d => d.failed_urls || 0)
      chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['完成任务', '取消任务', '入库条数', '放弃URL'], top: 0 },
        grid: { left: '3%', right: '4%', bottom: '8%', top: '15%', containLabel: true },
        xAxis: { type: 'category', data: dates, boundaryGap: false },
        yAxis: [
          { type: 'value', name: '任务数', minInterval: 1, position: 'left' },
          { type: 'value', name: '条数', minInterval: 1, position: 'right' },
        ],
        series: [
          {
            name: '完成任务', type: 'line', smooth: true, yAxisIndex: 0,
            symbol: 'circle', symbolSize: 5,
            itemStyle: { color: COLORS.finished },
            areaStyle: { color: 'rgba(103,194,58,0.08)' },
            data: finished,
          },
          {
            name: '取消任务', type: 'line', smooth: true, yAxisIndex: 0,
            symbol: 'circle', symbolSize: 5,
            itemStyle: { color: COLORS.cancelled },
            areaStyle: { color: 'rgba(245,108,108,0.08)' },
            data: cancelled,
          },
          {
            name: '入库条数', type: 'bar', yAxisIndex: 1,
            itemStyle: { color: 'rgba(156,39,176,0.6)' },
            data: itemScraped,
          },
          {
            name: '放弃URL', type: 'bar', yAxisIndex: 1,
            itemStyle: { color: 'rgba(245,108,108,0.5)' },
            data: failedUrls,
          },
        ],
      })
    },

    renderBarProj() {
      const chart = this.ensureChart('barProjRef')
      if (!chart) return
      const data = (this._projectCounts || []).slice(0, 10)
      const names = data.map(d => d.name)
      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', minInterval: 1 },
        yAxis: { type: 'category', data: names, axisLabel: { fontSize: 11 } },
        series: [
          {
            type: 'bar',
            itemStyle: {
              color: (params) => {
                const palette = ['#409EFF','#67C23A','#E6A23C','#F56C6C','#909399']
                return palette[params.dataIndex % palette.length]
              },
            },
            label: { show: true, position: 'right', fontSize: 11 },
            data: data.map(d => (d.finished || 0) + (d.cancelled || 0)),
          },
        ],
      })
    },

    resizeCharts() {
      Object.values(this.charts).forEach(c => c && c.resize())
    },
  },
}
</script>

<style scoped>
.stats-wrap { padding: 0; }

.stats-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.stats-title { font-size: 16px; font-weight: 600; color: #303133; }
.toolbar-right { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 0; }
.live-push-hint { font-size: 12px; color: #67c23a; margin-right: 4px; }
.stats-ws-alert { margin-bottom: 12px; }

.kpi-row { margin-bottom: 4px; }
.kpi-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px 20px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}
.kpi-value { font-size: 32px; font-weight: 700; line-height: 1.2; }
.kpi-label { font-size: 13px; color: #606266; margin-top: 4px; }
.kpi-sub   { font-size: 12px; color: #909399; margin-top: 4px; }

.chart-card  { border-radius: 8px; }
.card-title  { font-size: 14px; font-weight: 600; color: #303133; }
.chart-box   { width: 100%; height: 280px; }
.chart-box-tall { width: 100%; height: 340px; }
</style>
