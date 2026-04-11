const { api } = require('../../utils/api')

const DEFAULT_FORM = {
  contact_name: '', phone: '', province: '',
  city: '', district: '', detail: '', is_default: false,
}

Page({
  data: {
    addresses: [],
    loading: false,
    showForm: false,
    saving: false,
    form: { ...DEFAULT_FORM },
  },

  onShow() { this._load() },

  async _load() {
    this.setData({ loading: true })
    try {
      const res = await api.listAddresses()
      this.setData({ addresses: res.data || [] })
    } finally {
      this.setData({ loading: false })
    }
  },

  showAdd() {
    this.setData({ form: { ...DEFAULT_FORM }, showForm: true })
  },

  hideForm() { this.setData({ showForm: false }) },

  onFormInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  onDefaultChange(e) {
    this.setData({ 'form.is_default': e.detail.value })
  },

  async saveAddress() {
    const f = this.data.form
    if (!f.contact_name || !f.phone || !f.province || !f.city || !f.detail) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' }); return
    }
    this.setData({ saving: true })
    try {
      await api.createAddress({ ...f, is_default: f.is_default ? 1 : 0 })
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.setData({ showForm: false })
      await this._load()
    } catch {
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  async setDefault(e) {
    const id = e.currentTarget.dataset.id
    try {
      await api.updateAddress(id, { is_default: 1 })
      await this._load()
    } catch {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  deleteAddr(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除地址',
      content: '确定删除该地址吗？',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteAddress(id)
            await this._load()
          } catch {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      },
    })
  },
})
