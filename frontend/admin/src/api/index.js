import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      if (window.location.pathname.includes('/login')) {
        // 在登录页不要跳转，显示错误提示让用户知道密码错误
        ElMessage.error(err.response?.data?.detail || '用户名或密码错误')
      } else {
        window.location.href = '/login'
      }
    } else {
      ElMessage.error(err.response?.data?.detail || '请求失败')
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (username, password) =>
    http.post('/api/auth/admin/login', { username, password }),
}

export const adminApi = {
  dashboard: () => http.get('/api/admin/dashboard'),
  // Orders
  listOrders: (params) => http.get('/api/admin/orders', { params }),
  updateOrder: (id, data) => http.put(`/api/admin/orders/${id}`, data),
  // Users
  listUsers: (params) => http.get('/api/admin/users', { params }),
  toggleUserStatus: (id) => http.put(`/api/admin/users/${id}/status`),
  // Recyclers
  listRecyclers: (params) => http.get('/api/admin/recyclers', { params }),
  createRecycler: (data) => http.post('/api/admin/recyclers', data),
  updateRecycler: (id, data) => http.put(`/api/admin/recyclers/${id}`, data),
  deleteRecycler: (id) => http.delete(`/api/admin/recyclers/${id}`),
  // Stats
  getStats: (params) => http.get('/api/admin/stats', { params }),
  // Settlement
  getSettlement: (year, month) => http.get('/api/admin/settlement', { params: { year, month } }),
  // Proof images
  uploadProof: (orderId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post(`/api/admin/orders/${orderId}/proof`, fd)
  },
}

export default http
