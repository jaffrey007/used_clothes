# 慢夏闲置衣服回收平台

> 一站式闲置衣物回收服务：用户通过手机端预约上门取件，管理员通过后台调度回收员、管理订单并查看数据报表。

## 技术栈

| 层次 | 技术 |
|------|------|
| 微信小程序端 | 原生微信小程序（WXML / WXSS / JS），微信开发者工具 |
| 管理后台 | Vue 3 + Vite + ElementPlus + ECharts (vue-echarts) + Pinia |
| 后端 API | Python 3.11 + FastAPI + SQLAlchemy 2 + PyMySQL |
| 数据库 | MySQL 8.0 |

## 项目结构

```
manxia/
├── README.md
├── database/
│   └── schema.sql              ← 数据库建表脚本（手动执行）
├── backend/                    ← FastAPI 后端，端口 8000
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/
│       ├── schemas/
│       ├── routers/
│       └── utils/
└── frontend/
    ├── miniapp/                ← 微信原生小程序（用微信开发者工具打开）
    │   ├── app.js              ← 小程序入口
    │   ├── app.json            ← 全局配置（pages、tabBar）
    │   ├── app.wxss            ← 全局样式
    │   ├── project.config.json ← 开发者工具配置
    │   ├── pages/              ← 所有页面
    │   │   ├── index/          ← 首页
    │   │   ├── recycle/        ← 立即回收
    │   │   ├── orders/         ← 订单列表
    │   │   ├── order-detail/   ← 订单详情
    │   │   ├── profile/        ← 个人中心
    │   │   ├── profile-edit/   ← 编辑资料
    │   │   ├── address-list/   ← 地址管理
    │   │   └── points/         ← 积分明细
    │   └── utils/
    │       ├── api.js          ← wx.request 封装
    │       ├── auth.js         ← wx.login / token 管理
    │       └── util.js         ← 公共格式化函数
    └── admin/                  ← 管理后台，端口 5174
        ├── package.json
        ├── .env.example
        └── src/
```

## 前置要求

- **Node.js** 18+
- **Python** 3.11+
- **MySQL** 8.0（本地或远程均可）

---

## 一、初始化数据库

> 你需要先在 MySQL 中执行建表脚本。

```bash
# 使用 MySQL 客户端执行（替换用户名和密码）
mysql -u root -p < database/schema.sql
```

执行后会创建数据库 `manxia`，并插入以下种子数据：
- 管理员账号：`admin` / `manxia2024`
- 3 个测试用户、3 个测试回收员、3 个测试订单

---

## 二、启动后端（FastAPI）

```bash
cd backend

# 1. 创建 Python 虚拟环境（推荐）
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，修改数据库连接信息：
# DATABASE_URL=mysql+pymysql://root:你的密码@localhost:3306/manxia

# 4. 启动服务
uvicorn app.main:app --reload --port 8000
```

后端启动后可访问：
- **API 文档（Swagger）**：http://localhost:8000/api/docs
- **健康检查**：http://localhost:8000/api/health

---

## 三、打开微信小程序（miniapp）

小程序使用**原生微信小程序**开发，需要用**微信开发者工具**打开：

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开微信开发者工具，点击「导入项目」
3. 项目目录选择 `frontend/miniapp`
4. 填入你的 AppID（没有则选「测试号」）
5. 打开 `utils/api.js`，将 `apiBase` 修改为后端地址：

```js
// 开发阶段
apiBase: 'http://localhost:8000'

// 如果手机真机调试，需改为本机局域网 IP，例如：
apiBase: 'http://192.168.1.100:8000'
```

6. 在微信开发者工具中点击「编译」即可预览

> **合法域名说明**：上线前需在微信公众平台配置服务器合法域名，开发阶段在工具中勾选「不校验合法域名」即可。

> **登录说明**：小程序会自动调用 `wx.login()` 获取 code，静默完成登录，无需用户手动操作。

---

## 四、启动管理后台（admin）

```bash
cd frontend/admin

# 1. 安装依赖（已下载跳过）
npm install

# 2. 配置 API 地址（可选）
cp .env.example .env

# 3. 启动开发服务器
npm run dev
```

访问：http://localhost:5174

登录账号：`admin` / `manxia2024`

---

## 环境变量说明

### 后端 `backend/.env`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DATABASE_URL` | `mysql+pymysql://root:password@localhost:3306/manxia` | MySQL 连接字符串 |
| `SECRET_KEY` | `dev-secret-key-...` | JWT 签名密钥（生产环境必须修改） |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | Token 有效期（分钟），默认 7 天 |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | 允许的跨域来源（逗号分隔） |

### 前端 `frontend/miniapp/.env` 和 `frontend/admin/.env`

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | 后端 API 地址 |

---

## 主要功能

### 微信小程序端

| 页面 | 说明 |
|------|------|
| 首页 | 轮播图、今日参与人数、动态消息栏、回收流程步骤、FAQ |
| 立即回收 | 选择衣物类型（4大品类）、取件地址、预约时间、预估重量、备注快捷标签 |
| 订单列表 | 下拉刷新、Tab筛选（所有/待取件/取件成功/待评价）、取消订单 |
| 订单详情 | 订单状态追踪、取件信息、品类明细、结算金额 |
| 个人中心 | 微信头像、积分余额、订单快捷入口、环保减碳数据、邀请卡、服务菜单 |
| 积分明细 | 积分余额大图、收支明细列表 |
| 地址管理 | 新增/删除/设默认地址 |
| 编辑资料 | 修改昵称、手机号 |

### 管理后台

| 页面 | 说明 |
|------|------|
| 仪表盘 | KPI 卡片、7日趋势折线图、品类饼图、状态分布、最近订单 |
| 订单管理 | 列表、搜索/状态筛选、指派回收员、更新状态、填写实际重量 |
| 用户管理 | 用户列表、搜索、禁用/启用 |
| 回收员管理 | 增删改查、区域分配、状态管理 |
| 数据统计 | 日期范围筛选、月度订单&重量趋势、品类分布、数据导出 CSV |

---

## API 接口概览

### 用户端

```
POST /api/auth/login          微信模拟登录
GET  /api/users/me            获取当前用户信息
PUT  /api/users/me            更新用户信息
GET  /api/users/addresses     地址列表
POST /api/users/addresses     创建地址
PUT  /api/users/addresses/:id 更新地址
DEL  /api/users/addresses/:id 删除地址
GET  /api/orders              订单列表（支持状态筛选、分页）
POST /api/orders              创建预约订单
GET  /api/orders/:id          订单详情
PUT  /api/orders/:id/cancel   取消订单
GET  /api/points              积分余额和明细
```

### 管理端（需 Bearer Token）

```
POST /api/auth/admin/login         管理员登录
GET  /api/admin/dashboard          仪表盘数据
GET  /api/admin/orders             订单列表（支持筛选分页）
PUT  /api/admin/orders/:id         更新订单（状态/回收员/重量）
GET  /api/admin/users              用户列表
PUT  /api/admin/users/:id/status   切换用户状态
GET  /api/admin/recyclers          回收员列表
POST /api/admin/recyclers          创建回收员
PUT  /api/admin/recyclers/:id      更新回收员
DEL  /api/admin/recyclers/:id      删除回收员
GET  /api/admin/stats              统计数据（月度/品类）
```

---

## 构建生产版本

```bash
# 移动端
cd frontend/miniapp && npm run build

# 管理后台
cd frontend/admin && npm run build

# 后端（使用 gunicorn 生产部署）
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## 注意事项

1. **微信登录**：当前为演示模式，直接点击即创建账号。接入真实微信小程序时，替换 `backend/app/routers/auth.py` 中的 `openid` 逻辑，调用微信服务端 `code2session` 接口。
2. **SECRET_KEY**：生产环境必须设置强随机密钥（推荐 `openssl rand -hex 32`）。
3. **积分规则**：当前默认每回收 1kg 获得 10 积分，可在 `backend/app/routers/admin.py` 中调整系数。
# used_clothes
