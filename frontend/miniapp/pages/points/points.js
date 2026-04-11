const { api } = require('../../utils/api')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    summary: { balance: 0, total_earned: 0 },
    records: [],
  },

  onLoad() {
    this._load()
  },

  async _load() {
    try {
      const res = await api.getPoints()
      const d = res.data
      this.setData({
        summary: { balance: d.balance, total_earned: d.total_earned },
        records: (d.records || []).map(r => ({
          ...r,
          dateStr: formatDate(r.created_at),
        })),
      })
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },
})
