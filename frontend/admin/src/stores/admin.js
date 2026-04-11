import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '../api/index.js'

export const useAdminStore = defineStore('admin', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const adminInfo = ref(null)

  async function login(username, password) {
    const res = await authApi.login(username, password)
    token.value = res.data.access_token
    localStorage.setItem('admin_token', token.value)
  }

  function logout() {
    token.value = ''
    adminInfo.value = null
    localStorage.removeItem('admin_token')
  }

  return { token, adminInfo, login, logout }
})
