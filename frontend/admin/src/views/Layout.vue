<template>
  <el-container style="height:100vh">
    <!-- Sidebar -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="sidebar">
      <div class="sidebar-header">
        <div class="brand-icon">♻</div>
        <span v-if="!collapsed" class="brand-name">慢夏回收管理</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        :collapse="collapsed"
        background-color="transparent"
        text-color="rgba(255,255,255,0.7)"
        active-text-color="#4caf7d"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><List /></el-icon>
          <template #title>订单管理</template>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="/recyclers">
          <el-icon><Van /></el-icon>
          <template #title>回收员管理</template>
        </el-menu-item>
        <el-menu-item index="/stats">
          <el-icon><TrendCharts /></el-icon>
          <template #title>数据统计</template>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <el-icon class="collapse-btn" @click="collapsed = !collapsed">
          <component :is="collapsed ? 'Expand' : 'Fold'" />
        </el-icon>
      </div>
    </el-aside>

    <el-container>
      <!-- Header -->
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-button text @click="handleLogout">
            <el-icon><SwitchButton /></el-icon> 退出登录
          </el-button>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAdminStore } from '../stores/admin.js'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
const collapsed = ref(false)

const activeMenu = computed(() => '/' + route.path.split('/')[1])

const PAGE_TITLES = {
  dashboard: '仪表盘',
  orders: '订单管理',
  users: '用户管理',
  recyclers: '回收员管理',
  stats: '数据统计',
}

const currentPageTitle = computed(() => {
  const seg = route.path.split('/')[1]
  return PAGE_TITLES[seg] || ''
})

async function handleLogout() {
  await ElMessageBox.confirm('确定退出登录？', '提示', { type: 'warning' })
  adminStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.sidebar {
  background: var(--sidebar-bg);
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  color: #fff;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  height: 64px;
  overflow: hidden;
}

.brand-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border: none;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-menu :deep(.el-menu-item) {
  margin: 4px 8px;
  border-radius: 8px;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: rgba(76, 175, 125, 0.15) !important;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  justify-content: flex-end;
}

.collapse-btn {
  color: rgba(255,255,255,0.5);
  font-size: 18px;
  cursor: pointer;
}

.header {
  background: #fff;
  border-bottom: 1px solid #ebedf0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.main-content {
  background: #f5f7fa;
  overflow-y: auto;
}
</style>
