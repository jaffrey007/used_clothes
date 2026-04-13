const { api } = require('../../utils/api')
const { clearToken } = require('../../utils/auth')

Page({
  data: {
    isLoggedIn: false,
    logging: false,
    userInfo: {},
    recycleCount: 0,
    carbonKg: '0.0',
    showCarbon: false,
    showInviteModal: false,
    shortcuts: [
      { icon: '📋', label: '所有订单', status: -1 },
      { icon: '🚗', label: '待取件',   status: 0 },
      { icon: '✅', label: '取件成功', status: 2 },
      { icon: '⭐', label: '待评价',   status: 3 },
    ],
    services: [
      { icon: '📦', label: '商品订单',   action: 'noop' },
      { icon: '💬', label: '在线客服',   action: 'noop' },
      { icon: '📍', label: '地址管理',   action: 'address' },
      { icon: '📢', label: '投诉反馈',   action: 'noop' },
      { icon: '👤', label: '个人资料',   action: 'edit' },
      { icon: '⚙️', label: '系统设置',   action: 'noop' },
      { icon: '🔗', label: '分享',       action: 'invite' },
      { icon: '📣', label: '我的推广',   action: 'invite' },
    ],
  },

  onShow() {
    const app = getApp()
    const loggedIn = !!app.globalData.isLoggedIn
    // 只在状态真正变化时才 setData，避免无意义重绘导致闪烁
    if (loggedIn !== this.data.isLoggedIn) {
      this.setData({ isLoggedIn: loggedIn })
    }
    if (loggedIn) {
      this._loadUser()
    }
  },

  // ── 微信一键登录 ──
  async handleLogin() {
    this.setData({ logging: true })
    try {
      const app = getApp()
      const userInfo = await app.doLogin()
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo || {},
      })
      this._updateEco(userInfo)

      // 首次登录（昵称为默认"新用户"）→ 引导完善资料
      const isNewUser = !userInfo || userInfo.nickname === '新用户' || !userInfo.nickname
      if (isNewUser) {
        wx.showModal({
          title: '登录成功 🎉',
          content: '欢迎使用慢夏回收！请完善您的昵称和头像',
          confirmText: '去完善',
          cancelText: '稍后',
          success(res) {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/profile-edit/profile-edit?first=1' })
            }
          },
        })
      } else {
        wx.showToast({ title: '登录成功', icon: 'success' })
      }
    } catch (e) {
      console.error('login failed', e)
      wx.showToast({ title: '登录失败，请检查网络后重试', icon: 'none', duration: 2500 })
    } finally {
      this.setData({ logging: false })
    }
  },

  async _loadUser() {
    try {
      const res = await api.getMe()
      const u = res.data
      this.setData({ userInfo: u })
      this._updateEco(u)
      // 同步到全局
      getApp().globalData.userInfo = u
    } catch (e) {
      console.warn('load user failed', e)
      // token 已失效，退到未登录状态
      if (e && e.message && e.message.includes('401')) {
        clearToken()
        getApp().globalData.isLoggedIn = false
        this.setData({ isLoggedIn: false })
      }
    }
  },

  _updateEco(u) {
    if (!u) return
    const kg = parseFloat(u.total_recycled_kg) || 0
    this.setData({
      recycleCount: Math.floor(kg) || 0,
      carbonKg: (kg * 3.6).toFixed(1),
    })
  },

  goEdit() {
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' })
  },

  goOrders(e) {
    const status = e.currentTarget.dataset.status
    const url = status >= 0
      ? `/pages/orders/orders?status=${status}`
      : '/pages/orders/orders'
    wx.navigateTo({ url })
  },

  goPoints() {
    wx.navigateTo({ url: '/pages/points/points' })
  },

  handleService(e) {
    const action = e.currentTarget.dataset.action
    if (action === 'address') wx.navigateTo({ url: '/pages/address-list/address-list' })
    else if (action === 'edit') wx.navigateTo({ url: '/pages/profile-edit/profile-edit' })
    else if (action === 'invite') this.setData({ showInviteModal: true })
    else wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  showCarbonInfo() { this.setData({ showCarbon: true }) },
  hideCarbon()     { this.setData({ showCarbon: false }) },
  showInvite()     { this.setData({ showInviteModal: true }) },
  hideInvite()     { this.setData({ showInviteModal: false }) },

  copyInviteLink() {
    wx.setClipboardData({
      data: '我在慢夏回收平台，旧衣物换现金！快来用我的邀请链接注册：https://manxia.example.com',
      success: () => wx.showToast({ title: '已复制邀请链接', icon: 'success' }),
    })
    this.setData({ showInviteModal: false })
  },

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#ee0a24',
      success: (res) => {
        if (res.confirm) {
          clearToken()
          const app = getApp()
          app.globalData.isLoggedIn = false
          app.globalData.userInfo = null
          this.setData({ isLoggedIn: false, userInfo: {} })
        }
      },
    })
  },
})
