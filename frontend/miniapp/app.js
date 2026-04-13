const { ensureLogin, getToken, clearToken } = require('./utils/auth')

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    // 本地调试用 localhost；局域网演示改成你的 IP，如 'http://192.168.1.8:8000'
    apiBase: 'http://127.0.0.1:8000',
  },

  onLaunch() {
    // 有 token → 预加载用户信息；无 token → 等用户主动点击授权
    if (getToken()) {
      this._initUser()
    }
  },

  /**
   * 由页面主动调用：执行微信登录 + 换取 JWT + 拉取用户信息
   * 返回 Promise<userInfo>
   */
  async doLogin() {
    const token = await ensureLogin()
    const userInfo = await this.fetchUserInfo()
    this.globalData.isLoggedIn = true
    return userInfo
  },

  _initUser() {
    this.fetchUserInfo()
      .then(() => { this.globalData.isLoggedIn = true })
      .catch(() => {
        // token 过期或无效 → 清除并等用户主动授权
        clearToken()
        this.globalData.isLoggedIn = false
      })
  },

  async fetchUserInfo() {
    const { request } = require('./utils/api')
    const res = await request({ url: '/api/users/me' })
    this.globalData.userInfo = res.data
    return res.data
  },
})
