<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">仪表盘</h2>
      <span style="font-size:13px;color:#999">{{ today }}</span>
    </div>

    <!-- KPI Cards -->
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6" v-for="kpi in kpis" :key="kpi.label">
        <div class="stat-card">
          <div class="kpi-icon" :style="{ background: kpi.bg }">
            <el-icon :size="22" :color="kpi.color"><component :is="kpi.icon" /></el-icon>
          </div>
          <div class="kpi-info">
            <div class="kpi-val">{{ kpi.value }}</div>
            <div class="kpi-label">{{ kpi.label }}</div>
          </div>
          <div class="kpi-badge" :style="{ color: kpi.color }">{{ kpi.badge }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- Charts row -->
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="16">
        <div class="chart-card">
          <div class="chart-title">7日订单趋势</div>
          <v-chart :option="trendOption" autoresize style="height:280px" />
        </div>
      </el-col>
      <el-col :span="8">
        <div class="chart-card">
          <div class="chart-title">衣物品类分布</div>
          <v-chart :option="pieOption" autoresize style="height:280px" />
        </div>
      </el-col>
    </el-row>

    <!-- Status distribution + Recent orders -->
    <el-row :gutter="16">
      <el-col :span="8">
        <div class="chart-card" style="height:auto;padding:20px">
          <div class="chart-title">订单状态分布</div>
          <div class="status-list">
            <div class="status-row" v-for="s in statusRows" :key="s.label">
              <div class="status-dot" :style="{ background: s.color }"></div>
              <span class="status-name">{{ s.label }}</span>
              <el-progress
                :percentage="s.pct"
                :color="s.color"
                :show-text="false"
                style="flex:1;margin:0 12px"
              />
              <span class="status-cnt">{{ s.count }}</span>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="16">
        <div class="stat-card">
          <div class="chart-title" style="margin-bottom:12px">最近订单</div>
          <el-table :data="recentOrders" size="small" stripe>
            <el-table-column prop="order_no" label="订单号" min-width="160" />
            <el-table-column prop="addr_contact" label="用户" width="80" />
            <el-table-column prop="addr_full" label="地址" min-width="140" show-overflow-tooltip />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :color="statusColor(row.status)" effect="dark" size="small">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="110">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { adminApi } from '../api/index.js'

use([CanvasRenderer, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

const data = ref(null)
const recentOrders = ref([])

const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

const STATUS = {
  0: { label: '待接单', color: '#ff976a' },
  1: { label: '已接单', color: '#1989fa' },
  2: { label: '回收中', color: '#7d6ef7' },
  3: { label: '已完成', color: '#4caf7d' },
  4: { label: '已取消', color: '#999' },
}

const CAT_LABELS = { clothes: '衣服裤子', shoes: '鞋靠旧包', bedding: '床单被罩', plush: '毛绒玩具', other: '其他' }

function statusLabel(s) { return STATUS[s]?.label || '未知' }
function statusColor(s) { return STATUS[s]?.color || '#999' }
function formatDate(t) { return t ? new Date(t).toLocaleDateString('zh-CN') : '-' }

const kpis = computed(() => [
  {
    label: '总订单数', value: data.value?.total_orders ?? '-',
    icon: 'List', color: '#4caf7d', bg: '#e8f5ee', badge: '全部',
  },
  {
    label: '今日新增', value: data.value?.today_orders ?? '-',
    icon: 'Calendar', color: '#1989fa', bg: '#e8f4ff', badge: '今天',
  },
  {
    label: '注册用户', value: data.value?.total_users ?? '-',
    icon: 'User', color: '#ff976a', bg: '#fff3e8', badge: '累计',
  },
  {
    label: '回收总重量', value: data.value?.total_weight ? data.value.total_weight.toFixed(1) + 'kg' : '-',
    icon: 'Box', color: '#7d6ef7', bg: '#f0eeff', badge: '已完成',
  },
])

const trendOption = computed(() => {
  const trend = data.value?.trend || []
  return {
    tooltip: { trigger: 'axis' },
    grid: { top: 20, bottom: 30, left: 40, right: 20 },
    xAxis: {
      type: 'category',
      data: trend.map(t => t.date.slice(5)),
      axisLine: { lineStyle: { color: '#eee' } },
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [{
      type: 'line',
      data: trend.map(t => t.count),
      smooth: true,
      lineStyle: { color: '#4caf7d', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(76,175,125,0.3)' }, { offset: 1, color: 'rgba(76,175,125,0.02)' }] } },
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#4caf7d' },
    }],
  }
})

const pieOption = computed(() => {
  const cats = (data.value?.categories || []).map(c => ({
    name: CAT_LABELS[c.name] || c.name,
    value: c.value,
  }))
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12 } },
    color: ['#4caf7d', '#1989fa', '#ff976a', '#7d6ef7', '#aaa'],
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      data: cats,
      label: { show: false },
    }],
  }
})

const statusRows = computed(() => {
  const dist = data.value?.status_dist || {}
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1
  return Object.entries(STATUS).map(([k, v]) => ({
    label: v.label,
    color: v.color,
    count: dist[k] || 0,
    pct: Math.round(((dist[k] || 0) / total) * 100),
  }))
})

onMounted(async () => {
  try {
    const [dashRes, ordersRes] = await Promise.all([
      adminApi.dashboard(),
      adminApi.listOrders({ page: 1, page_size: 8 }),
    ])
    data.value = dashRes.data
    recentOrders.value = ordersRes.data || []
  } catch {}
})
</script>

<style scoped>
.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}

.kpi-info {
  flex: 1;
}

.kpi-val {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
  margin-bottom: 4px;
}

.kpi-label {
  font-size: 13px;
  color: #888;
}

.kpi-badge {
  font-size: 12px;
  font-weight: 600;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.status-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-name {
  font-size: 13px;
  color: #555;
  width: 52px;
  flex-shrink: 0;
}

.status-cnt {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  width: 30px;
  text-align: right;
}
</style>
