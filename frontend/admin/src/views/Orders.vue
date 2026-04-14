<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">订单管理</h2>
    </div>

    <!-- Filters -->
    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap">
      <el-input v-model="filter.keyword" placeholder="搜索订单号/联系人" clearable style="width:200px" @change="load">
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
        <el-table-column label="联系人" width="90">
          <template #default="{ row }">{{ row.addr_contact || '-' }}</template>
        </el-table-column>
        <el-table-column label="取件地址" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.addr_full }}</template>
        </el-table-column>
        <el-table-column label="预约时间" width="150">
          <template #default="{ row }">{{ formatDT(row.scheduled_time) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :color="statusColor(row.status)" effect="dark" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="回收员" width="100">
          <template #default="{ row }">
            <span v-if="row.recycler_name" style="font-weight:600;color:#333">{{ row.recycler_name }}</span>
            <span v-else style="color:#aaa">未指派</span>
          </template>
        </el-table-column>
        <el-table-column label="实重(kg)" width="90">
          <template #default="{ row }">{{ row.actual_weight || '-' }}</template>
        </el-table-column>
        <el-table-column label="金额(¥)" width="90">
          <template #default="{ row }">{{ row.final_amount || '-' }}</template>
        </el-table-column>
        <el-table-column label="凭证" width="70">
          <template #default="{ row }">
            <el-tag v-if="proofCount(row) > 0" type="success" size="small">{{ proofCount(row) }}张</el-tag>
            <span v-else style="color:#ccc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="110">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
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
    <el-dialog v-model="showEdit" title="处理订单" width="580px" :close-on-click-modal="false">
      <el-form :model="editForm" label-width="110px">
        <el-form-item label="订单号">
          <span style="font-family:monospace;color:#666">{{ editForm.order_no }}</span>
        </el-form-item>
        <el-form-item label="联系人/地址">
          <span style="color:#555">{{ editForm.addr_contact }} · {{ editForm.addr_full }}</span>
        </el-form-item>
        <el-form-item label="预约时间">
          <span style="color:#555">{{ editForm.scheduled_time ? formatDT(editForm.scheduled_time) : '-' }}</span>
        </el-form-item>
        <el-divider />
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
              :label="`${r.name}（${r.area}）${r.phone}`"
              :value="r.id"
            />
          </el-select>
          <div v-if="editForm.recycler_name" style="margin-top:4px;font-size:12px;color:#4caf7d">
            当前：{{ editForm.recycler_name }}
          </div>
        </el-form-item>
        <el-form-item label="实际重量(kg)">
          <el-input-number v-model="editForm.actual_weight" :min="0" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item v-if="editForm.status === 4" label="取消原因">
          <el-input v-model="editForm.cancel_reason" placeholder="选填" />
        </el-form-item>
        <el-divider>回收凭证图片（防止作弊）</el-divider>
        <el-form-item label="上传凭证">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <el-image
              v-for="(img, i) in proofList"
              :key="i"
              :src="apiBase + img"
              :preview-src-list="proofList.map(p => apiBase + p)"
              :initial-index="i"
              fit="cover"
              style="width:80px;height:80px;border-radius:6px;border:1px solid #eee"
            />
            <el-upload
              :show-file-list="false"
              accept="image/*"
              :before-upload="beforeUpload"
              style="display:inline-block"
            >
              <el-button size="small" :loading="uploading">+ 上传图片</el-button>
            </el-upload>
          </div>
          <div style="font-size:12px;color:#aaa;margin-top:4px">上传后立即保存，用于记录回收员的实际取件凭证</div>
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../api/index.js'

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const orders = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
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

// 当前编辑订单的凭证图片列表
const proofList = computed(() => {
  try { return JSON.parse(editForm.value.proof_images || '[]') } catch { return [] }
})

function proofCount(row) {
  try { return JSON.parse(row.proof_images || '[]').length } catch { return 0 }
}

function statusLabel(s) { return STATUS[s]?.label || '未知' }
function statusColor(s) { return STATUS[s]?.color || '#999' }
function formatDate(t) { return t ? new Date(t).toLocaleDateString('zh-CN') : '-' }
function formatDT(t) {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
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
    order_no: row.order_no,
    addr_contact: row.addr_contact,
    addr_full: row.addr_full,
    scheduled_time: row.scheduled_time,
    status: row.status,
    recycler_id: row.recycler_id || null,
    recycler_name: row.recycler_name || '',
    actual_weight: row.actual_weight ? Number(row.actual_weight) : null,
    cancel_reason: row.cancel_reason || '',
    proof_images: row.proof_images || '[]',
  }
  showEdit.value = true
}

async function beforeUpload(file) {
  uploading.value = true
  try {
    const res = await adminApi.uploadProof(editForm.value.id, file)
    editForm.value.proof_images = JSON.stringify(res.data.all)
    // 同步更新列表中的订单
    const idx = orders.value.findIndex(o => o.id === editForm.value.id)
    if (idx >= 0) orders.value[idx].proof_images = editForm.value.proof_images
    ElMessage.success('图片上传成功')
  } catch {
    ElMessage.error('图片上传失败')
  } finally {
    uploading.value = false
  }
  return false  // 阻止 el-upload 的默认行为
}

async function handleSave() {
  saving.value = true
  try {
    const payload = { status: editForm.value.status }
    if (editForm.value.recycler_id) payload.recycler_id = editForm.value.recycler_id
    if (editForm.value.actual_weight != null) payload.actual_weight = editForm.value.actual_weight
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

onMounted(() => { load(); loadRecyclers() })
</script>
