const { api } = require('../../utils/api')
const { statusLabel, statusCls, catLabel, formatDate, formatDateTime } = require('../../utils/util')

const TABS = [
  { label: '所有订单', val: null },
  { label: '待取件',   val: 0 },
  { label: '取件成功', val: 2 },
  { label: '待评价',   val: 3 },
]

Page({
  data: {
    tabs: TABS,
    activeTab: null,
    orders: [],
    loading: false,
    noMore: false,
    page: 1,
  },

  onLoad(options) {
    if (options.status !== undefined) {
      const val = parseInt(options.status, 10)
      this.setData({ activeTab: isNaN(val) || val < 0 ? null : val })
    }
    this._load()
  },

  onShow() {
    if (!getApp().globalData.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '请先前往"我的"页面完成微信授权登录',
        confirmText: '去登录',
        cancelText: '取消',
        success(res) {
          if (res.confirm) wx.switchTab({ url: '/pages/profile/profile' })
        },
      })
      return
    }
    this._reset()
    this._load()
  },

  onPullDownRefresh() {
    this._reset()
    this._load().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this._load(true)
    }
  },

  _reset() {
    this.setData({ orders: [], page: 1, noMore: false })
  },

  async _load(append = false) {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      const params = { page: this.data.page, page_size: 10 }
      if (this.data.activeTab !== null) params.status = this.data.activeTab

      const res = await api.listOrders(params)
      const items = (res.data || []).map(o => ({
        ...o,
        statusLabel: statusLabel(o.status),
        statusCls: statusCls(o.status),
        catLabels: (o.categories || []).map(c => catLabel(c.category)),
        scheduledTimeStr: formatDateTime(o.scheduled_time),
        createdDateStr: formatDate(o.created_at),
      }))

      const all = append ? [...this.data.orders, ...items] : items
      this.setData({
        orders: all,
        page: this.data.page + 1,
        noMore: all.length >= (res.total || 0),
      })
    } catch (e) {
      console.warn('load orders failed', e)
    } finally {
      this.setData({ loading: false })
    }
  },

  switchTab(e) {
    const val = e.currentTarget.dataset.val
    this.setData({ activeTab: val, orders: [], page: 1, noMore: false })
    this._load()
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  goRecycle() {
    wx.switchTab({ url: '/pages/recycle/recycle' })
  },

  cancelOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消订单',
      content: '确定要取消这个预约吗？',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.cancelOrder(id)
            wx.showToast({ title: '取消成功', icon: 'success' })
            this._reset()
            this._load()
          } catch {}
        }
      },
    })
  },
})
