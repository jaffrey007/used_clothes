<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-logo">
        <div class="logo-icon">♻</div>
        <h2>慢夏回收 · 管理后台</h2>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleLogin">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="admin" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          style="width:100%;margin-top:8px;background:#4caf7d;border-color:#4caf7d"
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </el-button>
      </el-form>

      <div class="login-hint">默认账号：admin / manxia2024</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '../stores/admin.js'

const router = useRouter()
const adminStore = useAdminStore()
const formRef = ref()
const loading = ref(false)

const form = ref({ username: 'admin', password: 'manxia2024' })
const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }],
}

async function handleLogin() {
  await formRef.value.validate()
  loading.value = true
  try {
    await adminStore.login(form.value.username, form.value.password)
    ElMessage.success('登录成功')
    router.replace('/dashboard')
  } catch {
    ElMessage.error('用户名或密码错误')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a2035 0%, #2e3f5c 100%);
}

.login-box {
  background: #fff;
  border-radius: 16px;
  padding: 48px 40px;
  width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.login-logo {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.login-logo h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.login-hint {
  text-align: center;
  font-size: 12px;
  color: #aaa;
  margin-top: 16px;
}
</style>
