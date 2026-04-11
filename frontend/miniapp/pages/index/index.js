const { ensureLogin } = require('../../utils/auth')

Page({
  data: {
    participantCount: 1286,
    tickerText: '张同学刚完成衣服回收赚了¥18.00 · 李同学完成书籍回收赚了¥9.60 · 王同学预约了上门取件',
    showFaq: false,
    banners: [
      { id: 1, bg: 'linear-gradient(135deg,#e8f5ee,#c8e6c9)', title: '旧衣物换现金', sub: '0.8元/kg，免费上门取件', emoji: '👕' },
      { id: 2, bg: 'linear-gradient(135deg,#e3f2fd,#bbdefb)', title: '绿色回收·减碳', sub: '每公斤减少碳排放约3.6kg', emoji: '🌍' },
      { id: 3, bg: 'linear-gradient(135deg,#fff8e1,#ffe082)', title: '积分兑换好礼', sub: '回收积分可兑换现金券', emoji: '🎁' },
    ],
    steps: [
      { icon: '📱', label: '线上预约' },
      { icon: '🚗', label: '上门取件' },
      { icon: '⚖️', label: '带走称重' },
      { icon: '✅', label: '质检结算' },
    ],
    faqs: [
      '现金奖励如何提取？',
      '哪些衣物会被认为无效？',
      '衣物多少件起收？',
    ],
    allFaqs: [
      { q: '现金奖励如何提取？', a: '完成回收后积分自动到账，可在个人中心提现到微信，1-3个工作日到账。' },
      { q: '哪些衣物会被认为无效？', a: '严重破损、霉变、潮湿的衣物不予收取，其余类型均可。' },
      { q: '衣物多少件起收？', a: '5件起收，建议打包成大袋再预约，减少往返次数。' },
      { q: '取件时间如何安排？', a: '预约后回收员会在30分钟内联系您确认取件时间，支持当天或次日上门。' },
      { q: '回收价格会变动吗？', a: '价格会根据市场行情调整，以下单时显示价格为准。' },
    ],
  },

  onLoad() {
    // 确保登录
    ensureLogin().catch(() => {})

    // 模拟参与人数动态增加
    this._timer = setInterval(() => {
      this.setData({ participantCount: this.data.participantCount + Math.floor(Math.random() * 3) })
    }, 5000)
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },

  goRecycle() {
    wx.switchTab({ url: '/pages/recycle/recycle' })
  },

  showFaqModal() {
    this.setData({ showFaq: true })
  },

  hideFaqModal() {
    this.setData({ showFaq: false })
  },
})
