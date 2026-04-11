const { getToken, clearToken, login } = require('./auth')

/**
 * 封装 wx.request，自动携带 token。
 * 401 时自动重新登录并重试一次，而不是直接跳转。
 */
function request({ url, method = 'GET', data = null, _retry = false }) {
  return new Promise((resolve, reject) => {
    const app = getApp()
    const token = getToken()

    wx.request({
      url: `${app.globalData.apiBase}${url}`,
      method,
      data,
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (res.statusCode === 401 && !_retry) {
          // token 失效 → 静默重新登录后重试一次
          clearToken()
          login()
            .then(() => request({ url, method, data, _retry: true }))
            .then(resolve)
            .catch(reject)
          return
        }
        if (res.statusCode >= 400) {
          const msg = res.data && res.data.detail
            ? res.data.detail
            : `请求失败 (${res.statusCode})`
          wx.showToast({ title: msg, icon: 'none', duration: 2000 })
          reject(new Error(msg))
          return
        }
        resolve(res.data)
      },
      fail(err) {
        // 网络超时且未重试过，等待后重试一次
        if (!_retry) {
          setTimeout(() => {
            request({ url, method, data, _retry: true }).then(resolve).catch(reject)
          }, 1000)
        } else {
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
          reject(err)
        }
      },
    })
  })
}

const api = {
  // Auth
  login: (code) => request({ url: '/api/auth/login', method: 'POST', data: { code } }),

  // User
  getMe: () => request({ url: '/api/users/me' }),
  updateMe: (data) => request({ url: '/api/users/me', method: 'PUT', data }),

  // Addresses
  listAddresses: () => request({ url: '/api/users/addresses' }),
  createAddress: (data) => request({ url: '/api/users/addresses', method: 'POST', data }),
  updateAddress: (id, data) => request({ url: `/api/users/addresses/${id}`, method: 'PUT', data }),
  deleteAddress: (id) => request({ url: `/api/users/addresses/${id}`, method: 'DELETE' }),

  // Orders
  listOrders: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    return request({ url: `/api/orders${query ? '?' + query : ''}` })
  },
  createOrder: (data) => request({ url: '/api/orders', method: 'POST', data }),
  getOrder: (id) => request({ url: `/api/orders/${id}` }),
  cancelOrder: (id, reason) =>
    request({ url: `/api/orders/${id}/cancel`, method: 'PUT', data: { cancel_reason: reason || null } }),

  // Points
  getPoints: () => request({ url: '/api/points' }),
}

module.exports = { request, api }
