const { getToken, clearToken, login } = require('./auth')

// 防止重复弹出"网络繁忙"提示
let _networkToastShown = false

function showNetworkError() {
  if (_networkToastShown) return
  _networkToastShown = true
  wx.showToast({
    title: '网络繁忙，请稍后重试',
    icon: 'none',
    duration: 2500,
  })
  setTimeout(() => { _networkToastShown = false }, 3000)
}

/**
 * 判断是否为网络不通（后端连不上）
 * fail 回调的 errMsg 包含 timeout / connrefused / fail 等关键词
 */
function isNetworkError(err) {
  if (!err) return false
  const msg = (err.errMsg || err.message || '').toLowerCase()
  return (
    msg.includes('timeout') ||
    msg.includes('fail') ||
    msg.includes('connrefused') ||
    msg.includes('network') ||
    msg.includes('connect')
  )
}

/**
 * 封装 wx.request，自动携带 token。
 * 401 时自动重新登录并重试一次；
 * 网络不通时统一提示"网络繁忙"。
 */
function request({ url, method = 'GET', data = null, _retry = false, _silent = false }) {
  return new Promise((resolve, reject) => {
    const app = getApp()
    const token = getToken()

    wx.request({
      url: `${app.globalData.apiBase}${url}`,
      method,
      data,
      timeout: 10000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success(res) {
        if (res.statusCode === 401 && !_retry) {
          // token 失效 → 静默重新登录后重试一次
          clearToken()
          login()
            .then(() => request({ url, method, data, _retry: true, _silent }))
            .then(resolve)
            .catch(err => {
              if (!_silent) showNetworkError()
              reject(err)
            })
          return
        }
        if (res.statusCode >= 400) {
          const msg = res.data && res.data.detail
            ? res.data.detail
            : `请求失败 (${res.statusCode})`
          if (!_silent) wx.showToast({ title: msg, icon: 'none', duration: 2000 })
          reject(new Error(msg))
          return
        }
        resolve(res.data)
      },
      fail(err) {
        if (!_retry) {
          // 重试一次
          setTimeout(() => {
            request({ url, method, data, _retry: true, _silent })
              .then(resolve)
              .catch(retryErr => {
                // 重试也失败 → 后端不通
                if (!_silent) showNetworkError()
                reject(retryErr)
              })
          }, 1000)
        } else {
          if (!_silent) showNetworkError()
          reject(err)
        }
      },
    })
  })
}

/**
 * 静默请求：失败时不弹 toast（用于后台预加载，不打扰用户）
 */
function silentRequest(options) {
  return request({ ...options, _silent: true })
}

const api = {
  // Auth
  login: (code) => request({ url: '/api/auth/login', method: 'POST', data: { code } }),

  // User
  getMe: ()       => request({ url: '/api/users/me' }),
  updateMe: (data) => request({ url: '/api/users/me', method: 'PUT', data }),

  // Addresses
  listAddresses:          ()         => request({ url: '/api/users/addresses' }),
  createAddress:          (data)     => request({ url: '/api/users/addresses', method: 'POST', data }),
  updateAddress:          (id, data) => request({ url: `/api/users/addresses/${id}`, method: 'PUT', data }),
  deleteAddress:          (id)       => request({ url: `/api/users/addresses/${id}`, method: 'DELETE' }),

  // Orders
  listOrders: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    return request({ url: `/api/orders${query ? '?' + query : ''}` })
  },
  createOrder:  (data)         => request({ url: '/api/orders', method: 'POST', data }),
  getOrder:     (id)           => request({ url: `/api/orders/${id}` }),
  cancelOrder:  (id, reason)   => request({ url: `/api/orders/${id}/cancel`, method: 'PUT', data: { cancel_reason: reason || null } }),

  // Points
  getPoints: () => request({ url: '/api/points' }),
}

module.exports = { request, silentRequest, api }
