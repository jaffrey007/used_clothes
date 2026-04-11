const { api } = require('../../utils/api')

Page({
  data: {
    avatarSrc: '',
    nickname: '',
    phone: '',
    saving: false,
    _avatarChanged: false,
  },

  onLoad(options) {
    // 来自首次登录引导时，可带 redirect=1 参数
    this._isFirstSetup = options.first === '1'

    const app = getApp()
    const u = app.globalData.userInfo
    if (u) {
      this.setData({
        avatarSrc: u.avatar_url || '',
        nickname:  u.nickname  || '',
        phone:     u.phone     || '',
      })
    } else {
      api.getMe().then(res => {
        const u = res.data
        this.setData({
          avatarSrc: u.avatar_url || '',
          nickname:  u.nickname  || '',
          phone:     u.phone     || '',
        })
      }).catch(() => {})
    }
  },

  // ── 微信官方头像选择器回调（open-type="chooseAvatar"）──
  onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl
    this.setData({ avatarSrc: tempPath, _avatarChanged: true })
  },

  // ── 昵称输入（type="nickname" 会把选中的微信昵称填入） ──
  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [key]: e.detail.value })
  },

  onNicknameBlur(e) {
    // type="nickname" 在失焦时 detail.value 是最终确认的昵称
    this.setData({ nickname: e.detail.value })
  },

  // ── 保存 ──
  async handleSave() {
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' }); return
    }
    this.setData({ saving: true })
    try {
      let avatarUrl = this.data.avatarSrc

      // 若头像是本地临时路径，先上传到服务器
      if (this.data._avatarChanged && avatarUrl && !avatarUrl.startsWith('http')) {
        avatarUrl = await this._uploadAvatar(avatarUrl)
      }

      await api.updateMe({
        nickname:   this.data.nickname.trim(),
        phone:      this.data.phone.trim() || null,
        avatar_url: avatarUrl || null,
      })

      // 刷新全局用户信息
      const res = await api.getMe()
      const app = getApp()
      app.globalData.userInfo = res.data
      app.globalData.isLoggedIn = true

      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        if (this._isFirstSetup) {
          wx.switchTab({ url: '/pages/profile/profile' })
        } else {
          wx.navigateBack()
        }
      }, 900)
    } catch (e) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  // 上传头像到后端
  _uploadAvatar(filePath) {
    return new Promise((resolve, reject) => {
      const app = getApp()
      const token = require('../../utils/auth').getToken()
      wx.uploadFile({
        url: `${app.globalData.apiBase}/api/users/avatar`,
        filePath,
        name: 'file',
        header: { Authorization: `Bearer ${token}` },
        success(res) {
          try {
            const data = JSON.parse(res.data)
            resolve(data.data && data.data.url ? data.data.url : filePath)
          } catch {
            // 上传接口不存在时，使用临时路径（仅本次会话有效）
            resolve(filePath)
          }
        },
        fail() {
          // 上传失败不影响昵称/手机号的保存
          resolve(filePath)
        },
      })
    })
  },
})
