<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <el-button :icon="Download" @click="handleExport">导出 Excel</el-button>
    </div>

    <div class="filter-bar" style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px">
      <el-input v-model="filter.keyword" placeholder="搜索昵称/手机号" clearable style="width:220px" @change="load">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="filter.status" placeholder="全部状态" clearable style="width:120px" @change="load">
        <el-option label="正常" :value="1" />
        <el-option label="禁用" :value="0" />
      </el-select>
      <el-button type="primary" @click="load" style="background:#4caf7d;border-color:#4caf7d">查询</el-button>
    </div>

    <div style="background:#fff;border-radius:12px;padding:20px">
      <el-table :data="users" v-loading="loading" stripe border>
        <el-table-column type="index" width="50" />
        <el-table-column label="头像" width="70">
          <template #default="{ row }">
            <el-avatar :src="row.avatar_url || defaultAvatar" :size="36" />
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="points" label="积分" width="80" />
        <el-table-column label="累计回收(kg)" width="110">
          <template #default="{ row }">{{ Number(row.total_recycled_kg).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" min-width="120">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.status === 1 ? 'danger' : 'success'"
              link
              @click="toggleStatus(row)"
            >{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { adminApi } from '../api/index.js'
import { exportExcel } from '../utils/excel.js'

const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const filter = ref({ keyword: '', status: null })
const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'

function formatDate(t) { return t ? new Date(t).toLocaleDateString('zh-CN') : '-' }

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: pageSize }
    if (filter.value.keyword) params.keyword = filter.value.keyword
    if (filter.value.status !== null && filter.value.status !== undefined) params.status = filter.value.status
    const res = await adminApi.listUsers(params)
    users.value = res.data || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

async function toggleStatus(row) {
  const action = row.status === 1 ? '禁用' : '启用'
  await ElMessageBox.confirm(`确定${action}用户 "${row.nickname}"？`, '提示')
  try {
    await adminApi.toggleUserStatus(row.id)
    ElMessage.success(`${action}成功`)
    await load()
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleExport() {
  try {
    const params = { page: 1, page_size: 1000 }
    if (filter.value.keyword) params.keyword = filter.value.keyword
    if (filter.value.status !== null && filter.value.status !== undefined) params.status = filter.value.status
    const res = await adminApi.listUsers(params)
    exportExcel(res.data || [], [
      { header: '昵称',       key: 'nickname',          width: 16 },
      { header: '手机号',     key: 'phone',             width: 14 },
      { header: '积分',       key: 'points',            width: 10 },
      { header: '累计回收kg', key: 'total_recycled_kg', width: 14, format: v => Number(v).toFixed(2) },
      { header: '状态',       key: 'status',            width: 8,  format: v => v === 1 ? '正常' : '禁用' },
      { header: '注册时间',   key: 'created_at',        width: 20, format: v => v ? new Date(v).toLocaleString('zh-CN') : '' },
    ], '用户列表')
  } catch { ElMessage.error('导出失败') }
}

onMounted(load)
</script>
