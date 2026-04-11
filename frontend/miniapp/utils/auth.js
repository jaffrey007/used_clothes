const TOKEN_KEY = 'mx_token'

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token)
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY)
}

/**
 * 获取微信 code，失败时用时间戳兜底（开发/模拟器模式）
 */
function getWxCode() {
  return new Promise((resolve) => {
    wx.login({
      timeout: 5000,
      success(res) {
        resolve(res.code || `demo_${Date.now()}`)
      },
      fail() {
        // 模拟器离线或 wx.login 不可用时，使用 demo code 仍可正常调试
        resolve(`demo_${Date.now()}`)
      },
    })
  })
}

/**
 * 向后端换取 JWT token
 */
function fetchToken(code) {
  return new Promise((resolve, reject) => {
    const app = getApp()
    wx.request({
      url: `${app.globalData.apiBase}/api/auth/login`,
      method: 'POST',
      data: { code },
      timeout: 10000,
      success(r) {
        const token = r.data && r.data.data && r.data.data.access_token
        if (token) {
          resolve(token)
        } else {
          reject(new Error('登录响应异常'))
        }
      },
      fail(err) {
        reject(err)
      },
    })
  })
}

/**
 * 完整登录流程，带重试
 */
async function login(retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const code = await getWxCode()
      const token = await fetchToken(code)
      setToken(token)
      return token
    } catch (e) {
      if (i === retries - 1) throw e
      // 短暂等待后重试
      await new Promise(r => setTimeout(r, 800))
    }
  }
}

/**
 * 确保已登录，有 token 则直接返回，否则登录
 */
async function ensureLogin() {
  const token = getToken()
  if (token) return token
  return login()
}

module.exports = { getToken, setToken, clearToken, login, ensureLogin }
