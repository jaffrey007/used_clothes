const app = getApp()

Page({
  data: {
    checked: false,          // 是否已完成身份检测
    recyclerInfo: null,
    gateMsg: '',
    gateSub: '',
    gateBtnText: '',
    gateAction: '',          // 'login' | 'back'
    orders: [],
    loading: false,
    activeTab: 'ongoing',
    showComplete: false,
    completing: false,
    actualWeight: '',
    currentOrderId: null,
    currentOrderIdx: null,
    showResult: false,
    resultData: {},
    apiBase: '',
  },

  onLoad() {
    this.setData({ apiBase: app.globalData.apiBase || '' })
  },

  onShow() {
    // 每次展示时重新验证（防止用户刚绑手机号后无法进入）
    this._checkIdentity()
  },

  // ── 身份核验 ──────────────────────────────────────────────────────────────

  async _checkIdentity() {
    // 1. 有缓存 token 时先去后端校验，防止旧手机号缓存错配
    const cachedToken = wx.getStorageSync('recyclerToken')
    if (cachedToken) {
      try {
        const res = await this._request('GET', '/api/recycler/me', null, cachedToken)
        // token 有效：以后端数据为准刷新缓存
        wx.setStorageSync('recyclerInfo', res.data)
        this.setData({ recyclerInfo: res.data, checked: true })
        this._loadOrders()
        return
      } catch (_) {
        // token 失效或账号不匹配，清除旧缓存
        wx.removeStorageSync('recyclerToken')
        wx.removeStorageSync('recyclerInfo')
      }
    }

    // 2. 检查用户是否已微信登录（token key 与 auth.js 保持一致）
    const userToken = wx.getStorageSync('mx_token')
    if (!userToken) {
      this.setData({
        checked: true,
        gateMsg: '请先登录微信账号',
        gateSub: '前往"我的"页面完成微信一键登录后再进入工作台',
        gateBtnText: '去登录',
        gateAction: 'login',
      })
      return
    }

    // 3. 用用户 token 换取回收员 token
    try {
      const res = await this._request('POST', '/api/recycler/auth-by-user', null, userToken)
      wx.setStorageSync('recyclerToken', res.data.token)
      wx.setStorageSync('recyclerInfo', res.data.recycler)
      this.setData({ recyclerInfo: res.data.recycler, checked: true })
      this._loadOrders()
    } catch (e) {
      const detail = e.detail || ''
      this.setData({
        checked: true,
        gateMsg: detail.includes('手机号') ? '未绑定手机号' : '非回收员账号',
        gateSub: detail.includes('手机号')
          ? '请先在"我的 → 个人资料"中绑定手机号，再进入工作台'
          : '当前微信账号未注册为回收员，如有疑问请联系管理员',
        gateBtnText: detail.includes('手机号') ? '去绑定手机号' : '返回',
        gateAction: detail.includes('手机号') ? 'bindPhone' : 'back',
      })
    }
  },

  handleGateAction() {
    const action = this.data.gateAction
    if (action === 'login') wx.switchTab({ url: '/pages/profile/profile' })
    else if (action === 'bindPhone') wx.navigateTo({ url: '/pages/profile-edit/profile-edit' })
    else wx.navigateBack()
  },

  // ── Tab 切换 ──────────────────────────────────────────────────────────────

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab, orders: [] })
    this._loadOrders()
  },

  // ── 加载订单 ──────────────────────────────────────────────────────────────

  async _loadOrders() {
    this.setData({ loading: true })
    try {
      const url = this.data.activeTab === 'done'
        ? '/api/recycler/orders?status=3'
        : '/api/recycler/orders'
      const res = await this._recyclerRequest('GET', url)
      this.setData({ orders: res.data || [] })
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // ── 确认接单（将状态从 0→1）────────────────────────────────────────────────

  async acceptOrder(e) {
    const { orderid, idx } = e.currentTarget.dataset
    try {
      await this._recyclerRequest('POST', `/api/recycler/orders/${orderid}/accept`)
      const orders = this.data.orders
      orders[idx].status = 1
      orders[idx].status_label = '已接单'
      this.setData({ orders })
      wx.showToast({ title: '已接单', icon: 'success' })
    } catch {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // ── 图片预览 ──────────────────────────────────────────────────────────────

  previewImg(e) {
    const { src, list, base } = e.currentTarget.dataset
    wx.previewImage({ current: src, urls: (list || []).map(u => base + u) })
  },

  // ── 上传凭证图片 ──────────────────────────────────────────────────────────

  chooseProofImg(e) {
    const { orderid, idx } = e.currentTarget.dataset
    wx.chooseMedia({
      count: 3, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles
        wx.showLoading({ title: '上传中...' })
        let done = 0
        files.forEach(f => {
          wx.uploadFile({
            url: `${app.globalData.apiBase}/api/recycler/orders/${orderid}/proof`,
            filePath: f.tempFilePath,
            name: 'file',
            header: { Authorization: `Bearer ${wx.getStorageSync('recyclerToken')}` },
            success: (r) => {
              try {
                const body = JSON.parse(r.data)
                if (body.code === 0) {
                  const orders = this.data.orders
                  orders[idx].proof_images = body.data.all
                  if (orders[idx].status === 1) {
                    orders[idx].status = 2
                    orders[idx].status_label = '回收中'
                  }
                  this.setData({ orders })
                }
              } catch (_) {}
            },
            fail: () => wx.showToast({ title: '上传失败', icon: 'none' }),
            complete: () => { done++; if (done === files.length) wx.hideLoading() },
          })
        })
      },
    })
  },

  // ── 填报重量弹窗 ─────────────────────────────────────────────────────────

  openComplete(e) {
    const { orderid, idx } = e.currentTarget.dataset
    this.setData({ showComplete: true, currentOrderId: orderid, currentOrderIdx: idx, actualWeight: '' })
  },
  closeComplete() { this.setData({ showComplete: false }) },
  onWeightInput(e) { this.setData({ actualWeight: e.detail.value }) },

  async submitComplete() {
    const w = parseFloat(this.data.actualWeight)
    if (!w || w <= 0) { wx.showToast({ title: '请输入正确重量', icon: 'none' }); return }
    this.setData({ completing: true })
    try {
      const res = await this._recyclerRequest(
        'POST',
        `/api/recycler/orders/${this.data.currentOrderId}/complete`,
        { actual_weight: w }
      )
      this.setData({
        showComplete: false,
        completing: false,
        showResult: true,
        resultData: res.data,
      })
      // 把该订单从进行中移除（已完成）
      const orders = this.data.orders.filter(o => o.id !== this.data.currentOrderId)
      this.setData({ orders })
    } catch (e) {
      const msg = (e && e.detail) ? e.detail : '提交失败，请重试'
      wx.showToast({ title: msg, icon: 'none', duration: 2500 })
    } finally {
      this.setData({ completing: false })
    }
  },

  closeResult() {
    this.setData({ showResult: false })
  },

  // ── 退出 ─────────────────────────────────────────────────────────────────

  handleLogout() {
    wx.showModal({
      title: '退出工作台', content: '确认退出？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('recyclerToken')
          wx.removeStorageSync('recyclerInfo')
          this.setData({ recyclerInfo: null, orders: [], checked: false })
          setTimeout(() => this._checkIdentity(), 100)
        }
      },
    })
  },

  // ── 携带回收员 token 的请求 ───────────────────────────────────────────────

  _recyclerRequest(method, path, data) {
    return this._request(method, path, data, wx.getStorageSync('recyclerToken'))
  },

  _request(method, path, data, token) {
    return new Promise((resolve, reject) => {
      const header = { 'Content-Type': 'application/json' }
      if (token) header.Authorization = `Bearer ${token}`
      wx.request({
        url: `${app.globalData.apiBase}${path}`,
        method, data, header, timeout: 10000,
        success(res) {
          if (res.statusCode === 200 && res.data.code === 0) resolve(res.data)
          else reject(res.data || { detail: '请求失败' })
        },
        fail() { reject({ detail: '网络繁忙，请稍后重试' }) },
      })
    })
  },
})
