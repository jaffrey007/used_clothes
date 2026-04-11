<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">数据统计</h2>
      <div style="display:flex;gap:12px">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:260px"
        />
        <el-button type="primary" @click="load" style="background:#4caf7d;border-color:#4caf7d">
          <el-icon><Search /></el-icon> 查询
        </el-button>
        <el-button @click="exportData">
          <el-icon><Download /></el-icon> 导出
        </el-button>
      </div>
    </div>

    <el-row :gutter="16" style="margin-bottom:20px">
      <!-- Monthly orders bar chart -->
      <el-col :span="16">
        <div class="chart-card">
          <div class="chart-title">月度订单 & 回收重量趋势</div>
          <v-chart :option="barOption" autoresize style="height:280px" />
        </div>
      </el-col>

      <!-- Category donut -->
      <el-col :span="8">
        <div class="chart-card">
          <div class="chart-title">品类回收量</div>
          <v-chart :option="catOption" autoresize style="height:280px" />
        </div>
      </el-col>
    </el-row>

    <!-- Summary table -->
    <div style="background:#fff;border-radius:12px;padding:20px">
      <div style="font-size:15px;font-weight:600;margin-bottom:12px">月度明细</div>
      <el-table :data="stats?.monthly || []" border stripe>
        <el-table-column prop="month" label="月份" width="100" />
        <el-table-column prop="orders" label="订单数" width="100" />
        <el-table-column label="回收重量(kg)" width="130">
          <template #default="{ row }">{{ row.weight.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="预估收益(¥)" width="130">
          <template #default="{ row }">{{ (row.weight * 0.8).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="人均重量(kg)">
          <template #default="{ row }">
            {{ row.orders > 0 ? (row.weight / row.orders).toFixed(2) : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { adminApi } from '../api/index.js'

use([CanvasRenderer, BarChart, PieChart, LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent])

const stats = ref(null)
const dateRange = ref([])
const loading = ref(false)

const CAT_LABELS = { clothes: '衣服裤子', shoes: '鞋靠旧包', bedding: '床单被罩', plush: '毛绒玩具', other: '其他' }

const barOption = computed(() => {
  const monthly = stats.value?.monthly || []
  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { top: 20, bottom: 60, left: 50, right: 50 },
    dataZoom: [{ type: 'inside' }],
    xAxis: { type: 'category', data: monthly.map(m => m.month) },
    yAxis: [
      { type: 'value', name: '订单数', splitLine: { lineStyle: { color: '#f0f0f0' } } },
      { type: 'value', name: '重量(kg)', splitLine: { show: false } },
    ],
    series: [
      {
        name: '订单数',
        type: 'bar',
        data: monthly.map(m => m.orders),
        itemStyle: { color: '#4caf7d', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 40,
      },
      {
        name: '回收重量',
        type: 'line',
        yAxisIndex: 1,
        data: monthly.map(m => m.weight.toFixed(2)),
        lineStyle: { color: '#ff976a' },
        itemStyle: { color: '#ff976a' },
        smooth: true,
      },
    ],
  }
})

const catOption = computed(() => {
  const cats = (stats.value?.categories || []).map(c => ({
    name: CAT_LABELS[c.name] || c.name,
    value: c.qty,
  }))
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, itemWidth: 10 },
    color: ['#4caf7d', '#1989fa', '#ff976a', '#7d6ef7', '#aaa'],
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '42%'],
      data: cats.length ? cats : [{ name: '暂无数据', value: 1 }],
      label: { show: false },
    }],
  }
})

async function load() {
  loading.value = true
  try {
    const params = {}
    if (dateRange.value?.length) {
      params.start = dateRange.value[0]
      params.end = dateRange.value[1]
    }
    const res = await adminApi.getStats(params)
    stats.value = res.data
  } finally {
    loading.value = false
  }
}

function exportData() {
  const monthly = stats.value?.monthly || []
  if (!monthly.length) { ElMessage.warning('暂无数据可导出'); return }
  const headers = ['月份', '订单数', '回收重量(kg)', '预估收益(¥)']
  const rows = monthly.map(m => [m.month, m.orders, m.weight.toFixed(2), (m.weight * 0.8).toFixed(2)])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `慢夏回收统计_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>
