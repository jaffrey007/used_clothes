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
      { icon: '📦', label: '我的订单',   action: 'orders' },
      { icon: '💬', label: '在线客服',   action: 'noop' },
      { icon: '📍', label: '地址管理',   action: 'address' },
      { icon: '📢', label: '投诉反馈',   action: 'noop' },
      { icon: '👤', label: '个人资料',   action: 'edit' },
      { icon: '🚚', label: '回收员工作台', action: 'recycler' },
      { icon: '🔗', label: '分享',       action: 'invite' },
      { icon: '📣', label: '我的推广',   action: 'invite' },
    ],
  },

  onShow() {
    const app = getApp()
    const loggedIn = !!app.globalData.isLoggedIn
    if (loggedIn !== this.data.isLoggedIn) {
      this.setData({ isLoggedIn: loggedIn })
    }
    if (loggedIn) this._loadUser()
  },

  // ── 微信一键登录（全部合并为一次 setData，杜绝闪烁）──
  async handleLogin() {
    if (this.data.logging) return
    this.setData({ logging: true })
    try {
      const app = getApp()
      const userInfo = await app.doLogin()
      const kg = parseFloat((userInfo || {}).total_recycled_kg) || 0

      // 一次性设置所有状态，只触发一次渲染
      this.setData({
        logging: false,
        isLoggedIn: true,
        userInfo: userInfo || {},
        recycleCount: Math.floor(kg) || 0,
        carbonKg: (kg * 3.6).toFixed(1),
      })

      const isNewUser = !userInfo || userInfo.nickname === '新用户' || !userInfo.nickname
      if (isNewUser) {
        wx.showModal({
          title: '登录成功',
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
      this.setData({ logging: false })
      wx.showToast({ title: '登录失败，请检查网络后重试', icon: 'none', duration: 2500 })
    }
  },

  // ── 加载用户（也只做一次 setData）──
  async _loadUser() {
    try {
      const res = await api.getMe()
      const u = res.data
      const kg = parseFloat(u.total_recycled_kg) || 0
      getApp().globalData.userInfo = u
      this.setData({
        userInfo: u,
        recycleCount: Math.floor(kg) || 0,
        carbonKg: (kg * 3.6).toFixed(1),
      })
    } catch (e) {
      console.warn('load user failed', e)
      if (e && e.message && e.message.includes('401')) {
        clearToken()
        getApp().globalData.isLoggedIn = false
        this.setData({ isLoggedIn: false })
      }
    }
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
    else if (action === 'orders') wx.navigateTo({ url: '/pages/orders/orders' })
    else if (action === 'invite') this.setData({ showInviteModal: true })
    else if (action === 'recycler') wx.navigateTo({ url: '/pages/recycler-portal/recycler-portal' })
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
