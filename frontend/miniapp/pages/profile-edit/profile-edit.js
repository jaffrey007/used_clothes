const { api } = require('../../utils/api')

Page({
  data: {
    avatarSrc: '',
    nickname: '',
    phone: '',
    saving: false,
    _avatarChanged: false,

    // 手机号绑定相关
    editingPhone: false,
    inputPhone: '',
    smsCode: '',
    countDown: 0,
    _sentCode: '',    // 演示用：固定为 8888
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
    this.setData({ nickname: e.detail.value })
  },

  // ── 手机号绑定相关 ─────────────────────────────────────────────────────

  onChangePhone() {
    this.setData({ editingPhone: true, inputPhone: '', smsCode: '' })
  },

  cancelEditPhone() {
    this.setData({ editingPhone: false, inputPhone: '', smsCode: '', countDown: 0 })
  },

  onPhoneInput(e) { this.setData({ inputPhone: e.detail.value }) },
  onCodeInput(e)  { this.setData({ smsCode: e.detail.value }) },

  // 微信一键获取手机号（需要企业主体 AppID 才能返回真实数据）
  async onGetWxPhone(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '已取消授权', icon: 'none' })
      return
    }
    // 企业号会返回 encryptedData/code，个人号/touristappid 拿不到
    // 这里演示直接通过（实际项目应把 code 发给后端解密拿到真实手机号）
    if (!e.detail.code && !e.detail.encryptedData) {
      wx.showToast({
        title: '当前小程序未认证，请使用短信验证码绑定',
        icon: 'none',
        duration: 2500,
      })
      return
    }

    wx.showLoading({ title: '获取中...' })
    try {
      // TODO: 生产环境应把 e.detail.code 发给后端走微信"手机号快速验证"接口解密
      // 演示环境: 直接让用户手动输入后再用验证码绑定
      wx.hideLoading()
      wx.showToast({
        title: '企业主体小程序才支持该功能，请使用验证码',
        icon: 'none',
        duration: 2500,
      })
    } catch (_) {
      wx.hideLoading()
    }
  },

  // 发送短信验证码（演示：固定 8888）
  sendSmsCode() {
    if (this.data.countDown > 0) return
    const phone = this.data.inputPhone.trim()
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
      return
    }
    // 演示环境固定 8888。生产环境应调用后端短信接口
    this.setData({ _sentCode: '8888', countDown: 60 })
    wx.showModal({
      title: '📩 演示环境',
      content: `模拟发送验证码到 ${phone}\n\n验证码：8888\n\n（真实环境请对接短信服务商）`,
      showCancel: false,
      confirmText: '我知道了',
    })

    // 倒计时
    const timer = setInterval(() => {
      const cd = this.data.countDown - 1
      if (cd <= 0) {
        clearInterval(timer)
        this.setData({ countDown: 0 })
      } else {
        this.setData({ countDown: cd })
      }
    }, 1000)
  },

  // 校验验证码并绑定手机号
  async verifySmsCode() {
    const phone = this.data.inputPhone.trim()
    const code = this.data.smsCode.trim()
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!this.data._sentCode) {
      wx.showToast({ title: '请先获取验证码', icon: 'none' })
      return
    }
    if (code !== this.data._sentCode) {
      wx.showToast({ title: '验证码错误', icon: 'none' })
      return
    }
    this.setData({
      phone,
      editingPhone: false,
      inputPhone: '',
      smsCode: '',
      countDown: 0,
    })
    wx.showToast({ title: '手机号绑定成功', icon: 'success' })
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
