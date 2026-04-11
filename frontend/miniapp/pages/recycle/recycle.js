const { api } = require('../../utils/api')

const TIME_SLOTS = ['09:00 - 12:00', '14:00 - 18:00', '19:00 - 21:00']

Page({
  data: {
    categories: [
      { key: 'clothes', emoji: '👕', name: '衣服裤子' },
      { key: 'shoes',   emoji: '👜', name: '鞋靠旧包' },
      { key: 'bedding', emoji: '🛏', name: '床单被罩' },
      { key: 'plush',   emoji: '🧸', name: '毛绒玩具' },
    ],
    selectedCats: { clothes: true },
    weightOptions: [
      { val: 1, label: '5kg - 20kg',  sub: '(20件以上)' },
      { val: 2, label: '20kg - 50kg', sub: '(60件以上)' },
      { val: 3, label: '50kg以上',    sub: '(150件以上)' },
    ],
    selectedWeight: 0,
    quickTags: ['放门口了', '带打包袋', '超重包裹', '尽早联系'],
    selectedTags: {},
    customNote: '',
    // 地址
    addresses: [],
    selectedAddressId: null,
    selectedAddress: '',
    showAddressPicker: false,
    // 时间
    pickerDate: '',
    minDate: '',
    maxDate: '',
    selectedDate: '',
    timeSlots: TIME_SLOTS,
    timeSlotIdx: 0,
    selectedTimeSlot: '',
    submitting: false,
  },

  onLoad() {
    const now = new Date()
    const max = new Date(now.getTime() + 30 * 86400000)
    this.setData({
      minDate: this._fmtDate(now),
      maxDate: this._fmtDate(max),
      pickerDate: this._fmtDate(now),
    })
  },

  onShow() {
    this._ensureAuth(() => this._loadAddresses())
  },

  // 若未登录，引导到"我的"页面完成授权
  _ensureAuth(cb) {
    const app = getApp()
    if (app.globalData.isLoggedIn) {
      cb && cb()
      return
    }
    wx.showModal({
      title: '需要登录',
      content: '请先前往"我的"页面完成微信授权登录',
      confirmText: '去登录',
      cancelText: '取消',
      success(res) {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/profile/profile' })
        }
      },
    })
  },

  _fmtDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  async _loadAddresses() {
    try {
      const res = await api.listAddresses()
      const addrs = res.data || []
      this.setData({ addresses: addrs })
      const def = addrs.find(a => a.is_default === 1)
      if (def && !this.data.selectedAddressId) {
        this.setData({
          selectedAddressId: def.id,
          selectedAddress: `${def.province}${def.city}${def.district}${def.detail}`,
        })
      }
    } catch (e) {
      console.warn('load addresses failed', e)
    }
  },

  // ── 品类 ──
  toggleCat(e) {
    const key = e.currentTarget.dataset.key
    const selected = Object.assign({}, this.data.selectedCats)
    selected[key] = !selected[key]
    this.setData({ selectedCats: selected })
  },

  // ── 重量 ──
  selectWeight(e) {
    this.setData({ selectedWeight: e.currentTarget.dataset.val })
  },

  // ── 备注快捷标签 ──
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    const tags = Object.assign({}, this.data.selectedTags)
    tags[tag] = !tags[tag]
    this.setData({ selectedTags: tags })
  },

  onNoteInput(e) {
    this.setData({ customNote: e.detail.value })
  },

  // ── 取件地址 ──
  chooseAddress() {
    this.setData({ showAddressPicker: true })
  },

  closeAddressPicker() {
    this.setData({ showAddressPicker: false })
  },

  selectAddress(e) {
    const { id, full } = e.currentTarget.dataset
    this.setData({
      selectedAddressId: id,
      selectedAddress: full,
      showAddressPicker: false,
    })
  },

  goAddAddress() {
    this.setData({ showAddressPicker: false })
    wx.navigateTo({ url: '/pages/address-list/address-list' })
  },

  // ── 预约日期（picker 直接回调） ──
  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value,
      pickerDate: e.detail.value,
    })
  },

  // ── 取件时段（selector picker 回调） ──
  onTimeSlotChange(e) {
    const idx = e.detail.value
    this.setData({
      timeSlotIdx: idx,
      selectedTimeSlot: TIME_SLOTS[idx],
    })
  },

  // ── 提交预约 ──
  async handleSubmit() {
    if (!getApp().globalData.isLoggedIn) {
      this._ensureAuth(); return
    }
    if (!this.data.selectedAddressId) {
      wx.showToast({ title: '请选择取件地址', icon: 'none' }); return
    }
    if (!this.data.selectedDate) {
      wx.showToast({ title: '请选择预约日期', icon: 'none' }); return
    }
    if (!this.data.selectedTimeSlot) {
      wx.showToast({ title: '请选择取件时段', icon: 'none' }); return
    }

    const cats = Object.entries(this.data.selectedCats)
      .filter(([, v]) => v)
      .map(([k]) => k)
    if (cats.length === 0) {
      wx.showToast({ title: '请选择衣物类型', icon: 'none' }); return
    }

    this.setData({ submitting: true })
    try {
      const noteParts = [
        ...Object.entries(this.data.selectedTags).filter(([, v]) => v).map(([k]) => k),
        this.data.customNote,
      ].filter(Boolean)

      // 将日期+时段合成 ISO datetime 用于后端
      const slot = this.data.selectedTimeSlot.split(' - ')[0]  // e.g. "09:00"
      const scheduledISO = new Date(`${this.data.selectedDate}T${slot}:00`).toISOString()

      await api.createOrder({
        address_id: this.data.selectedAddressId,
        scheduled_time: scheduledISO,
        estimated_weight: this.data.selectedWeight,
        categories: cats.map(k => ({ category: k, qty: 1 })),
        notes: noteParts.join('，') || null,
      })

      wx.showToast({ title: '预约成功！', icon: 'success' })
      setTimeout(() => wx.navigateTo({ url: '/pages/orders/orders' }), 1200)
    } catch (e) {
      wx.showToast({ title: '预约失败，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
