import * as XLSX from 'xlsx'

/**
 * 导出数组数据为 Excel 文件
 * @param {Array} data        行数据数组（对象数组）
 * @param {Array} columns     列配置 [{header:'显示名', key:'字段名', width:15}]
 * @param {string} filename   文件名（不含扩展名）
 */
export function exportExcel(data, columns, filename = 'export') {
  const header = columns.map(c => c.header)
  const rows = data.map(row =>
    columns.map(c => {
      const val = typeof c.format === 'function' ? c.format(row[c.key], row) : row[c.key]
      return val == null ? '' : val
    })
  )

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])

  // 列宽
  ws['!cols'] = columns.map(c => ({ wch: c.width || 16 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}_${fmtDate(new Date())}.xlsx`)
}

function fmtDate(d) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
}
