const { api } = require('../../utils/api')
const { statusLabel, statusCls, catLabel, weightLabel, formatDate, formatDateTime } = require('../../utils/util')

const STATUS_INFO = {
  0: { icon: '⏳', desc: '您的预约已提交，等待回收员接单' },
  1: { icon: '✋', desc: '回收员已接单，将在预约时间上门取件' },
  2: { icon: '🚗', desc: '回收员正在前往您的地址' },
  3: { icon: '✅', desc: '回收已完成，积分已到账' },
  4: { icon: '❌', desc: '订单已取消' },
}

Page({
  data: { order: null },

  onLoad(options) {
    this._id = options.id
    this._load()
  },

  onShow() {
    if (this._id) this._load()
  },

  async _load() {
    try {
      const res = await api.getOrder(this._id)
      const o = res.data
      const info = STATUS_INFO[o.status] || {}
      this.setData({
        order: {
          ...o,
          statusLabel: statusLabel(o.status),
          statusIcon: info.icon || '❓',
          statusDesc: info.desc || '',
          catLabels: (o.categories || []).map(c => catLabel(c.category)),
          weightLabel: weightLabel(o.estimated_weight),
          scheduledTimeStr: formatDateTime(o.scheduled_time),
          createdStr: formatDate(o.created_at),
        },
      })
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  cancelOrder() {
    wx.showModal({
      title: '取消订单',
      content: '确定要取消这个预约吗？',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.cancelOrder(this._id)
            wx.showToast({ title: '取消成功', icon: 'success' })
            await this._load()
          } catch {}
        }
      },
    })
  },
})
