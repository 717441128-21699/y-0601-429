import { useEffect, useState } from 'react'
import {
  BarChart3, Download, TrendingUp, FileWarning, Warehouse, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { api } from '@/lib/api'
import type { MonthlyReport } from '@/types/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const CHART_COLORS = ['#D4A843', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function StatisticsUtilization() {
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7))
  const [toast, setToast] = useState('')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const data = await api.getMonthlyReport(exportMonth)
        setReport(data)
      } catch {
        setReport(null)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [exportMonth])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const shiftMonth = (delta: number) => {
    const [y, m] = exportMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const yy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    setExportMonth(`${yy}-${mm}`)
  }

  const exportPDF = () => {
    if (!report) return
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(18)
    const title = '档案馆月度运行报告'
    const titleWidth = doc.getTextWidth(title)
    doc.text(title, (pageWidth - titleWidth) / 2, 25)

    doc.setFontSize(10)
    const monthText = `统计月份：${report.month}`
    doc.text(monthText, 14, 35)

    const summaryData = [
      ['总档案数', report.summary.totalArchives.toString()],
      ['当月借阅申请', report.summary.monthBorrows.toString()],
      ['当月通过', report.summary.monthApproved.toString()],
      ['当月待审批', report.summary.monthPending.toString()],
      ['当月拒绝', report.summary.monthRejected.toString()],
      ['当月新增逾期', report.summary.monthOverdueCount.toString()],
      ['当月逾期费用', `${report.summary.monthOverdueFee.toFixed(2)}元`],
      ['累计逾期未还', report.summary.totalOverdueCount.toString()],
      ['累计逾期费用', `${report.summary.totalOverdueFee.toFixed(2)}元`],
    ]

    autoTable(doc, {
      head: [['指标', '数值']],
      body: summaryData,
      startY: 42,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [212, 168, 67], textColor: 0 },
      theme: 'grid',
      tableWidth: 85,
      margin: { left: 14 },
    })

    if (report.chainGrowth) {
      const cg = report.chainGrowth
      const chainData = [
        ['借阅申请量', `${cg.borrowsChange > 0 ? '+' : ''}${cg.borrowsChange}件`, `${cg.borrowsChangeRate > 0 ? '+' : ''}${cg.borrowsChangeRate.toFixed(1)}%`],
        ['新增逾期', `${cg.overdueCountChange > 0 ? '+' : ''}${cg.overdueCountChange}件`, '-'],
        ['逾期费用', `${cg.overdueFeeChange > 0 ? '+' : ''}${cg.overdueFeeChange.toFixed(1)}元`, '-'],
        ['审批通过率', `${cg.approvalRateChange > 0 ? '+' : ''}${cg.approvalRateChange.toFixed(1)}个百分点`, '-'],
      ]
      autoTable(doc, {
        head: [['环比指标', '变化量', '变化率']],
        body: chainData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [107, 114, 128], textColor: 255 },
        theme: 'grid',
        margin: { left: 14 },
      })
    }

    const yAfterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

    doc.setFontSize(12)
    doc.text('当月借阅趋势（按日）', 14, yAfterSummary)

    const trendRows = report.borrowingTrend.map(t => [t.date.slice(5), t.count.toString(), t.approved.toString()])
    autoTable(doc, {
      head: [['日期', '申请数', '通过数']],
      body: trendRows.length > 0 ? trendRows : [['-', '0', '0']],
      startY: yAfterSummary + 5,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      theme: 'grid',
      margin: { left: 14, right: 14 },
    })

    const yAfterTrend = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

    doc.setFontSize(12)
    doc.text('按借阅类型统计', 14, yAfterTrend)

    const typeRows = report.borrowByType.map(t => [t.type, t.count.toString()])
    autoTable(doc, {
      head: [['类型', '数量']],
      body: typeRows.length > 0 ? typeRows : [['-', '0']],
      startY: yAfterTrend + 5,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] },
      theme: 'grid',
      tableWidth: 80,
      margin: { left: 14 },
    })

    const yAfterType = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

    doc.setFontSize(12)
    doc.text('各库房利用率与借阅量', 14, yAfterType)

    const whRows = report.warehouseUtilization.map(w => [
      w.name, w.location, `${w.used}/${w.capacity}`,
      `${w.usage_rate.toFixed(1)}%`, w.month_borrow_count.toString(),
    ])
    autoTable(doc, {
      head: [['库房名称', '位置', '容量使用', '使用率', '当月借阅']],
      body: whRows,
      startY: yAfterType + 5,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [139, 92, 246] },
      theme: 'grid',
      margin: { left: 14, right: 14 },
    })

    const yAfterWh = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

    if (yAfterWh > 260) {
      doc.addPage()
    }
    const nextY = yAfterWh > 260 ? 25 : yAfterWh

    doc.setFontSize(12)
    doc.text('按部门借阅统计', 14, nextY)

    const deptRows = report.borrowByDepartment.map(d => [d.department || '未知', d.count.toString(), d.approved.toString()])
    autoTable(doc, {
      head: [['部门', '申请数', '通过数']],
      body: deptRows.length > 0 ? deptRows : [['-', '0', '0']],
      startY: nextY + 5,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [239, 68, 68] },
      theme: 'grid',
      margin: { left: 14, right: 14 },
    })

    doc.save(`档案馆月度报告_${report.month}.pdf`)
  }

  const exportExcel = () => {
    if (!report) return
    const wb = XLSX.utils.book_new()

    const summaryData = [
      ['指标', '数值'],
      ['统计月份', report.month],
      ['总档案数', report.summary.totalArchives],
      ['当月借阅申请', report.summary.monthBorrows],
      ['当月通过', report.summary.monthApproved],
      ['当月待审批', report.summary.monthPending],
      ['当月拒绝', report.summary.monthRejected],
      ['当月新增逾期', report.summary.monthOverdueCount],
      ['当月逾期费用(元)', report.summary.monthOverdueFee],
      ['累计逾期未还', report.summary.totalOverdueCount],
      ['累计逾期费用(元)', report.summary.totalOverdueFee],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    ws1['!cols'] = [{ wch: 18 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws1, '核心指标')

    const trendData = [
      ['日期', '申请数', '通过数'],
      ...report.borrowingTrend.map(t => [t.date, t.count, t.approved]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(trendData)
    ws2['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws2, '借阅趋势')

    const typeData = [
      ['类型', '数量'],
      ...report.borrowByType.map(t => [t.type, t.count]),
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(typeData)
    ws3['!cols'] = [{ wch: 14 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws3, '借阅类型')

    const whData = [
      ['库房名称', '位置', '容量', '已用', '使用率(%)', '当月借阅'],
      ...report.warehouseUtilization.map(w => [
        w.name, w.location, w.capacity, w.used, w.usage_rate, w.month_borrow_count,
      ]),
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(whData)
    ws4['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws4, '库房统计')

    const deptData = [
      ['部门', '申请数', '通过数'],
      ...report.borrowByDepartment.map(d => [d.department || '未知', d.count, d.approved]),
    ]
    const ws5 = XLSX.utils.aoa_to_sheet(deptData)
    ws5['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws5, '部门统计')

    if (report.chainGrowth) {
      const cg = report.chainGrowth
      const chainData = [
        ['环比指标', '变化量', '变化率'],
        ['借阅申请量', cg.borrowsChange, cg.borrowsChangeRate],
        ['新增逾期', cg.overdueCountChange, '-'],
        ['逾期费用(元)', cg.overdueFeeChange, '-'],
        ['审批通过率(百分点)', cg.approvalRateChange, '-'],
      ]
      const ws6 = XLSX.utils.aoa_to_sheet(chainData)
      ws6['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, ws6, '环比对比')
    }

    XLSX.writeFile(wb, `档案馆月度报告_${report.month}.xlsx`)
  }

  const handleExport = (format: 'pdf' | 'excel') => {
    try {
      if (format === 'pdf') {
        exportPDF()
      } else {
        exportExcel()
      }
      showToast('报告导出成功')
    } catch {
      showToast('报告导出失败')
    }
  }

  if (loading || !report) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const s = report.summary
  const monthLabel = `${report.month.slice(0, 4)}年${report.month.slice(5, 7)}月`
  const approvalRate = s.monthBorrows > 0 ? ((s.monthApproved / s.monthBorrows) * 100).toFixed(1) : '0'

  const trendChartData = report.borrowingTrend.map(t => ({
    date: t.date.slice(5),
    申请: t.count,
    通过: t.approved,
  }))

  const pieData = report.borrowByType.map((t, i) => ({
    name: t.type,
    value: t.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  const whChartData = report.warehouseUtilization.map(w => ({
    name: w.name,
    使用率: Number(w.usage_rate.toFixed(1)),
    当月借阅: w.month_borrow_count,
  }))

  const deptChartData = report.borrowByDepartment
    .slice(0, 6)
    .map(d => ({ name: d.department || '未知', 申请: d.count, 通过: d.approved }))

  const summaryCards = [
    { label: '总档案数', value: s.totalArchives, icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: `${monthLabel}借阅申请`, value: s.monthBorrows, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
    { label: '审批通过率', value: `${approvalRate}%`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { label: '累计逾期未还', value: s.totalOverdueCount, icon: FileWarning, color: 'text-danger', bg: 'bg-danger/10' },
    { label: '累计逾期费用', value: `${s.totalOverdueFee.toFixed(1)}元`, icon: FileWarning, color: 'text-warning', bg: 'bg-warning/10' },
    { label: '待审批', value: s.monthPending, icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-accent text-primary px-5 py-3 rounded-lg shadow-lg animate-slide-in font-medium">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="section-title m-0">
          <BarChart3 className="w-5 h-5 text-accent" />
          月度运行报告
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-muted" />
            <button
              onClick={() => shiftMonth(-1)}
              className="btn-ghost !p-2"
              title="上一月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="month"
              className="input-base !w-[160px]"
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
            />
            <button
              onClick={() => shiftMonth(1)}
              className="btn-ghost !p-2"
              title="下一月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => shiftMonth(-1)} className="btn-secondary text-xs !px-2.5 !py-1.5">-1月</button>
            <button onClick={() => shiftMonth(-2)} className="btn-secondary text-xs !px-2.5 !py-1.5">-2月</button>
            <button onClick={() => shiftMonth(-3)} className="btn-secondary text-xs !px-2.5 !py-1.5">-3月</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('pdf')} className="btn-primary flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              导出PDF
            </button>
            <button onClick={() => handleExport('excel')} className="btn-secondary flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              导出Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {summaryCards.map((c, i) => (
          <div key={i} className="card-base p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text-muted text-sm">{c.label}</p>
                <p className={`text-2xl font-semibold mt-2 ${c.color}`}>{c.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${c.bg}`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-base p-5">
        <h3 className="text-heading text-sm mb-4 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-accent" />
          环比上月
        </h3>
        {report.chainGrowth ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface rounded-lg p-4">
              <p className="text-text-muted text-xs mb-1.5">借阅申请量</p>
              <p className="text-lg font-semibold text-text-primary">
                {report.chainGrowth.borrowsChange > 0 ? '+' : ''}{report.chainGrowth.borrowsChange}件
              </p>
              <p className={`text-sm mt-1 font-medium ${report.chainGrowth.borrowsChangeRate >= 0 ? 'text-success' : 'text-danger'}`}>
                {report.chainGrowth.borrowsChangeRate > 0 ? '+' : ''}{report.chainGrowth.borrowsChangeRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <p className="text-text-muted text-xs mb-1.5">新增逾期</p>
              <p className="text-lg font-semibold text-text-primary">
                {report.chainGrowth.overdueCountChange > 0 ? '+' : ''}{report.chainGrowth.overdueCountChange}件
              </p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <p className="text-text-muted text-xs mb-1.5">逾期费用</p>
              <p className="text-lg font-semibold text-text-primary">
                {report.chainGrowth.overdueFeeChange > 0 ? '+' : ''}{report.chainGrowth.overdueFeeChange.toFixed(1)}元
              </p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <p className="text-text-muted text-xs mb-1.5">审批通过率</p>
              <p className="text-lg font-semibold text-text-primary">
                {report.chainGrowth.approvalRateChange > 0 ? '+' : ''}{report.chainGrowth.approvalRateChange.toFixed(1)}个百分点
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-text-muted text-sm">上月数据不足，无法计算环比</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card-base p-5">
          <h3 className="text-heading text-sm mb-4">当月借阅趋势（按日）</h3>
          <div className="h-[280px]">
            {trendChartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">当月暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card)" />
                  <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface)', border: 'none', borderRadius: '8px', color: 'var(--color-text-primary)' }}
                    cursor={{ fill: 'rgba(212, 168, 67, 0.05)' }}
                  />
                  <Legend />
                  <Bar dataKey="申请" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="通过" fill="#D4A843" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card-base p-5">
          <h3 className="text-heading text-sm mb-4">借阅类型分布</h3>
          <div className="h-[280px]">
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">当月暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface)', border: 'none', borderRadius: '8px', color: 'var(--color-text-primary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card-base p-5">
          <h3 className="text-heading text-sm mb-4 flex items-center gap-1.5">
            <Warehouse className="w-4 h-4 text-accent" />
            各库房利用率与借阅量
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={whChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card)" />
                <XAxis type="number" stroke="var(--color-text-muted)" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" fontSize={11} width={72} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface)', border: 'none', borderRadius: '8px', color: 'var(--color-text-primary)' }}
                />
                <Legend />
                <Bar dataKey="使用率" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="当月借阅" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-base p-5">
          <h3 className="text-heading text-sm mb-4">部门借阅统计（TOP6）</h3>
          <div className="h-[300px]">
            {deptChartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">当月暂无数据</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={deptChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card)" />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface)', border: 'none', borderRadius: '8px', color: 'var(--color-text-primary)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="申请" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="通过" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card-base p-5">
        <h3 className="text-heading text-sm mb-4 flex items-center gap-1.5">
          <Warehouse className="w-4 h-4 text-accent" />
          库房明细
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">库房名称</th>
                <th className="px-4 py-3 text-left">位置</th>
                <th className="px-4 py-3 text-left">容量</th>
                <th className="px-4 py-3 text-left">已用</th>
                <th className="px-4 py-3 text-left">使用率</th>
                <th className="px-4 py-3 text-left">当月借阅</th>
                <th className="px-4 py-3 text-left">库存状态</th>
              </tr>
            </thead>
            <tbody>
              {report.warehouseUtilization.map(w => (
                <tr key={w.id} className="table-row">
                  <td className="px-4 py-3 text-text-primary font-medium">{w.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{w.location}</td>
                  <td className="px-4 py-3 text-text-secondary">{w.capacity}</td>
                  <td className="px-4 py-3 text-text-secondary">{w.used}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-card rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${w.usage_rate > 80 ? 'bg-danger' : w.usage_rate > 60 ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${Math.min(w.usage_rate, 100)}%` }}
                        />
                      </div>
                      <span className="text-text-secondary text-xs">{w.usage_rate.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-accent font-medium">{w.month_borrow_count}</td>
                  <td className="px-4 py-3">
                    <span className={w.usage_rate > 80 ? 'badge-danger' : w.usage_rate > 60 ? 'badge-warning' : 'badge-success'}>
                      {w.usage_rate > 80 ? '容量紧张' : w.usage_rate > 60 ? '正常使用' : '库存充足'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
