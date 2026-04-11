<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">订单管理</h2>
    </div>

    <!-- Filters -->
    <div class="filter-bar" style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px">
      <el-input v-model="filter.keyword" placeholder="搜索订单号" clearable style="width:200px" @change="load">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="filter.status" placeholder="全部状态" clearable style="width:140px" @change="load">
        <el-option v-for="(v, k) in STATUS" :key="k" :label="v.label" :value="Number(k)" />
      </el-select>
      <el-button type="primary" @click="load" style="background:#4caf7d;border-color:#4caf7d">查询</el-button>
    </div>

    <div style="background:#fff;border-radius:12px;padding:20px">
      <el-table :data="orders" v-loading="loading" stripe border style="width:100%">
        <el-table-column prop="order_no" label="订单号" min-width="160" />
        <el-table-column label="用户" width="90">
          <template #default="{ row }">{{ row.addr_contact }}</template>
        </el-table-column>
        <el-table-column label="取件地址" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.addr_full }}</template>
        </el-table-column>
        <el-table-column label="预约时间" width="140">
          <template #default="{ row }">{{ formatDT(row.scheduled_time) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :color="statusColor(row.status)" effect="dark" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="回收员" width="90">
          <template #default="{ row }">{{ row.recycler_id ? `#${row.recycler_id}` : '-' }}</template>
        </el-table-column>
        <el-table-column label="实重(kg)" width="90">
          <template #default="{ row }">{{ row.actual_weight || '-' }}</template>
        </el-table-column>
        <el-table-column label="金额(¥)" width="90">
          <template #default="{ row }">{{ row.final_amount || '-' }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="110">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openEdit(row)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top:16px;justify-content:flex-end"
        @current-change="load"
      />
    </div>

    <!-- Edit dialog -->
    <el-dialog v-model="showEdit" title="处理订单" width="500px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="更新状态">
          <el-select v-model="editForm.status" style="width:100%">
            <el-option v-for="(v, k) in STATUS" :key="k" :label="v.label" :value="Number(k)" />
          </el-select>
        </el-form-item>
        <el-form-item label="指派回收员">
          <el-select v-model="editForm.recycler_id" placeholder="请选择" clearable style="width:100%">
            <el-option
              v-for="r in recyclers"
              :key="r.id"
              :label="`${r.name} (${r.area})`"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="实际重量(kg)">
          <el-input-number
            v-model="editForm.actual_weight"
            :min="0"
            :precision="2"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item v-if="editForm.status === 4" label="取消原因">
          <el-input v-model="editForm.cancel_reason" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave"
          style="background:#4caf7d;border-color:#4caf7d">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../api/index.js'

const orders = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const saving = ref(false)
const showEdit = ref(false)
const editForm = ref({})
const recyclers = ref([])

const filter = ref({ keyword: '', status: null })

const STATUS = {
  0: { label: '待接单', color: '#ff976a' },
  1: { label: '已接单', color: '#1989fa' },
  2: { label: '回收中', color: '#7d6ef7' },
  3: { label: '已完成', color: '#4caf7d' },
  4: { label: '已取消', color: '#999' },
}

function statusLabel(s) { return STATUS[s]?.label || '未知' }
function statusColor(s) { return STATUS[s]?.color || '#999' }
function formatDate(t) { return t ? new Date(t).toLocaleDateString('zh-CN') : '-' }
function formatDT(t) {
  return t ? new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'
}

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize }
    if (filter.value.keyword) params.keyword = filter.value.keyword
    if (filter.value.status !== null && filter.value.status !== undefined) params.status = filter.value.status
    const res = await adminApi.listOrders(params)
    orders.value = res.data || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

async function loadRecyclers() {
  try {
    const res = await adminApi.listRecyclers({ page_size: 100 })
    recyclers.value = res.data || []
  } catch {}
}

function openEdit(row) {
  editForm.value = {
    id: row.id,
    status: row.status,
    recycler_id: row.recycler_id || null,
    actual_weight: row.actual_weight ? Number(row.actual_weight) : null,
    cancel_reason: row.cancel_reason || '',
  }
  showEdit.value = true
}

async function handleSave() {
  saving.value = true
  try {
    const payload = { status: editForm.value.status }
    if (editForm.value.recycler_id) payload.recycler_id = editForm.value.recycler_id
    if (editForm.value.actual_weight) payload.actual_weight = editForm.value.actual_weight
    if (editForm.value.cancel_reason) payload.cancel_reason = editForm.value.cancel_reason
    await adminApi.updateOrder(editForm.value.id, payload)
    ElMessage.success('更新成功')
    showEdit.value = false
    await load()
  } catch {
    ElMessage.error('更新失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
  loadRecyclers()
})
</script>
