<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">回收员结算</h2>
    </div>

    <!-- 筛选 -->
    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;gap:12px;align-items:center">
      <el-date-picker
        v-model="period"
        type="month"
        placeholder="选择月份"
        format="YYYY年MM月"
        value-format="YYYY-MM"
        style="width:180px"
        @change="load"
      />
      <el-button type="primary" :loading="loading" @click="load"
        style="background:#4caf7d;border-color:#4caf7d">查询</el-button>
      <el-button :icon="Download" @click="handleExport" :disabled="rows.length === 0">导出 Excel</el-button>
      <span style="color:#999;font-size:13px">· 平台结算价 0.6 元/kg，用户到手价 0.8 元/kg，利润 0.2 元/kg</span>
    </div>

    <!-- 汇总卡片 -->
    <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <div v-for="card in summary" :key="card.label"
        style="flex:1;min-width:160px;background:#fff;border-radius:12px;padding:16px 20px">
        <div style="font-size:12px;color:#999;margin-bottom:6px">{{ card.label }}</div>
        <div style="font-size:24px;font-weight:700;color:#333">{{ card.value }}</div>
      </div>
    </div>

    <!-- 明细表 -->
    <div style="background:#fff;border-radius:12px;padding:20px">
      <el-table :data="rows" v-loading="loading" stripe border style="width:100%">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="area" label="负责区域" min-width="120" show-overflow-tooltip />
        <el-table-column prop="order_count" label="完成订单" width="90" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.order_count }} 单</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="total_weight" label="回收总量(kg)" width="120" align="right">
          <template #default="{ row }">
            <span style="font-weight:600">{{ row.total_weight.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="用户实付(¥)" width="120" align="right">
          <template #default="{ row }">{{ row.total_amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="应付回收员(¥)" width="140" align="right">
          <template #default="{ row }">
            <span style="color:#4caf7d;font-weight:700">{{ row.recycler_payout.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="平台利润(¥)" width="120" align="right">
          <template #default="{ row }">
            <span style="color:#1989fa">{{ row.platform_profit.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="结算状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="settled[row.recycler_id]" type="success">已结算</el-tag>
            <el-button v-else size="small" type="warning" @click="markSettled(row)"
              :disabled="row.order_count === 0">标记结算</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="rows.length === 0 && !loading" style="text-align:center;padding:40px;color:#aaa">
        暂无数据，请选择月份后查询
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { adminApi } from '../api/index.js'
import { exportExcel } from '../utils/excel.js'

const rows = ref([])
const loading = ref(false)
const settled = ref({})  // { recycler_id: true } 本地记录已结算（刷新后重置）

// 默认当前月
const now = new Date()
const period = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const summary = computed(() => {
  const totalOrders = rows.value.reduce((s, r) => s + r.order_count, 0)
  const totalWeight = rows.value.reduce((s, r) => s + r.total_weight, 0)
  const totalPayout = rows.value.reduce((s, r) => s + r.recycler_payout, 0)
  const totalProfit = rows.value.reduce((s, r) => s + r.platform_profit, 0)
  return [
    { label: '完成订单总数', value: `${totalOrders} 单` },
    { label: '回收总重量', value: `${totalWeight.toFixed(1)} kg` },
    { label: '应付回收员总计', value: `¥ ${totalPayout.toFixed(2)}` },
    { label: '平台利润总计', value: `¥ ${totalProfit.toFixed(2)}` },
  ]
})

async function load() {
  if (!period.value) return
  const [year, month] = period.value.split('-').map(Number)
  loading.value = true
  try {
    const res = await adminApi.getSettlement(year, month)
    rows.value = res.data || []
    settled.value = {}  // 重置结算状态
  } catch {
    ElMessage.error('查询失败')
  } finally {
    loading.value = false
  }
}

async function markSettled(row) {
  if (row.order_count === 0) return
  await ElMessageBox.confirm(
    `确认已向 ${row.name} 结算 ¥${row.recycler_payout.toFixed(2)}（${row.total_weight.toFixed(2)} kg × 0.6元）？`,
    '确认结算',
    { type: 'warning', confirmButtonText: '确认已付', cancelButtonText: '取消' }
  )
  settled.value[row.recycler_id] = true
  ElMessage.success(`已记录 ${row.name} 结算完成`)
}

function handleExport() {
  exportExcel(rows.value, [
    { header: '姓名',         key: 'name',            width: 12 },
    { header: '手机号',       key: 'phone',           width: 14 },
    { header: '负责区域',     key: 'area',            width: 20 },
    { header: '完成订单数',   key: 'order_count',     width: 12 },
    { header: '回收总量kg',   key: 'total_weight',    width: 14, format: v => Number(v).toFixed(2) },
    { header: '用户实付¥',   key: 'total_amount',    width: 14, format: v => Number(v).toFixed(2) },
    { header: '应付回收员¥', key: 'recycler_payout', width: 16, format: v => Number(v).toFixed(2) },
    { header: '平台利润¥',   key: 'platform_profit', width: 14, format: v => Number(v).toFixed(2) },
    { header: '结算状态',     key: 'recycler_id',     width: 10, format: (_, row) => settled.value[row.recycler_id] ? '已结算' : '未结算' },
  ], `回收员结算_${period.value}`)
}

// 首次加载
load()
</script>
