const STATUS_MAP = {
  0: { label: '待接单', cls: 'tag-pending' },
  1: { label: '已接单', cls: 'tag-accepted' },
  2: { label: '回收中', cls: 'tag-going' },
  3: { label: '已完成', cls: 'tag-done' },
  4: { label: '已取消', cls: 'tag-cancel' },
}

const CAT_MAP = {
  clothes: '衣服裤子',
  shoes: '鞋靠旧包',
  bedding: '床单被罩',
  plush: '毛绒玩具',
  other: '其他',
}

const WEIGHT_MAP = {
  0: '不确定',
  1: '5-20kg（20件以上）',
  2: '20-50kg（60件以上）',
  3: '50kg以上（150件以上）',
}

function statusLabel(s) { return STATUS_MAP[s]?.label || '未知' }
function statusCls(s) { return STATUS_MAP[s]?.cls || '' }
function catLabel(c) { return CAT_MAP[c] || c }
function weightLabel(w) { return WEIGHT_MAP[w] || '-' }

function formatDate(t) {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateTime(t) {
  if (!t) return '-'
  const d = new Date(t)
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function pad(n) { return String(n).padStart(2, '0') }

module.exports = { statusLabel, statusCls, catLabel, weightLabel, formatDate, formatDateTime }
