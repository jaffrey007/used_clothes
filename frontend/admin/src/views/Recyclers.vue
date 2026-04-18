<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">回收员管理</h2>
      <div style="display:flex;gap:8px">
        <el-button :icon="Download" @click="handleExport">导出 Excel</el-button>
        <el-button type="primary" @click="openCreate" style="background:#4caf7d;border-color:#4caf7d">
          <el-icon><Plus /></el-icon> 新增回收员
        </el-button>
      </div>
    </div>

    <div class="filter-bar" style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px">
      <el-input v-model="filter.keyword" placeholder="搜索姓名/电话" clearable style="width:220px" @change="load">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="filter.status" placeholder="全部状态" clearable style="width:120px" @change="load">
        <el-option label="空闲" :value="1" />
        <el-option label="忙碌" :value="2" />
        <el-option label="禁用" :value="0" />
      </el-select>
      <el-button type="primary" @click="load" style="background:#4caf7d;border-color:#4caf7d">查询</el-button>
    </div>

    <div style="background:#fff;border-radius:12px;padding:20px">
      <el-table :data="recyclers" v-loading="loading" stripe border>
        <el-table-column type="index" width="50" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="area" label="负责区域" min-width="140" />
        <el-table-column label="评分" width="80">
          <template #default="{ row }">
            <el-rate :model-value="Number(row.rating)" disabled show-score score-template="{value}" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="order_count" label="完成订单" width="90" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="120">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
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

    <!-- Create/Edit drawer -->
    <el-drawer
      v-model="showForm"
      :title="editId ? '编辑回收员' : '新增回收员'"
      size="420px"
    >
      <el-form :model="form" label-width="90px" style="padding:0 8px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="身份证号">
          <el-input v-model="form.id_card" placeholder="选填" maxlength="18" />
        </el-form-item>
        <el-form-item label="负责区域">
          <el-input v-model="form.area" placeholder="例如：上海市浦东新区" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="空闲" :value="1" />
            <el-option label="忙碌" :value="2" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave"
          style="background:#4caf7d;border-color:#4caf7d">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { adminApi } from '../api/index.js'
import { exportExcel } from '../utils/excel.js'

const recyclers = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)
const editId = ref(null)
const filter = ref({ keyword: '', status: null })
const form = ref({ name: '', phone: '', id_card: '', area: '', status: 1 })

const STATUS_MAP = { 0: { label: '禁用', type: 'danger' }, 1: { label: '空闲', type: 'success' }, 2: { label: '忙碌', type: 'warning' } }
function statusLabel(s) { return STATUS_MAP[s]?.label || '-' }
function statusType(s) { return STATUS_MAP[s]?.type || 'info' }
function formatDate(t) { return t ? new Date(t).toLocaleDateString('zh-CN') : '-' }

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize }
    if (filter.value.keyword) params.keyword = filter.value.keyword
    if (filter.value.status !== null && filter.value.status !== undefined) params.status = filter.value.status
    const res = await adminApi.listRecyclers(params)
    recyclers.value = res.data || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editId.value = null
  form.value = { name: '', phone: '', id_card: '', area: '', status: 1 }
  showForm.value = true
}

function openEdit(row) {
  editId.value = row.id
  form.value = { name: row.name, phone: row.phone, id_card: row.id_card || '', area: row.area, status: row.status }
  showForm.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.phone) {
    ElMessage.warning('姓名和手机号必填')
    return
  }
  saving.value = true
  try {
    if (editId.value) {
      await adminApi.updateRecycler(editId.value, form.value)
    } else {
      await adminApi.createRecycler(form.value)
    }
    ElMessage.success('保存成功')
    showForm.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除回收员 "${row.name}"？`, '提示', { type: 'warning' })
  try {
    await adminApi.deleteRecycler(row.id)
    ElMessage.success('删除成功')
    await load()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function handleExport() {
  try {
    const params = { page: 1, page_size: 1000 }
    if (filter.value.keyword) params.keyword = filter.value.keyword
    if (filter.value.status !== null && filter.value.status !== undefined) params.status = filter.value.status
    const res = await adminApi.listRecyclers(params)
    exportExcel(res.data || [], [
      { header: '姓名',     key: 'name',        width: 12 },
      { header: '手机号',   key: 'phone',       width: 14 },
      { header: '身份证',   key: 'id_card',     width: 20 },
      { header: '负责区域', key: 'area',        width: 24 },
      { header: '状态',     key: 'status',      width: 8,  format: v => statusLabel(v) },
      { header: '评分',     key: 'rating',      width: 8 },
      { header: '完成订单', key: 'order_count', width: 10 },
      { header: '创建时间', key: 'created_at',  width: 20, format: v => v ? new Date(v).toLocaleString('zh-CN') : '' },
    ], '回收员列表')
  } catch { ElMessage.error('导出失败') }
}

onMounted(load)
</script>
