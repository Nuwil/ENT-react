import { useState, useEffect, useMemo, useRef } from 'react'
import Chart from 'chart.js/auto'

const FILTER_LABELS = {
  all: 'All Time',
  today: 'Today',
  week: 'This Week',
  month: 'This Month'
}

const ENT_COLORS = {
  ear: '#ff6b6b',
  nose: '#4c9ffe',
  throat: '#2ecc71',
  other: '#94a3b8'
}

const PANEL_STYLE = {
  background: '#fff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
  border: '1px solid rgba(226, 232, 240, 0.8)'
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterConfig, setFilterConfig] = useState({ type: 'preset', value: 'all', range: null })
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const donutChartRef = useRef(null)
  const weeklyChartRef = useRef(null)
  const forecastChartRef = useRef(null)
  const donutChartInstanceRef = useRef(null)
  const weeklyChartInstanceRef = useRef(null)
  const forecastChartInstanceRef = useRef(null)

  useEffect(() => {
    applyPresetFilter('all')
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [filterConfig])

  useEffect(() => {
    if (filterConfig?.type !== 'preset' || filterConfig.value !== 'week') return
    const timeout = getNextMondayMidnight() - new Date()
    if (timeout <= 0) return
    const timerId = setTimeout(() => applyPresetFilter('week'), timeout)
    return () => clearTimeout(timerId)
  }, [filterConfig])

  useEffect(() => {
    renderCharts()
    return () => destroyCharts()
  }, [analytics])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      const data = await window.electronAPI.getAnalytics(filterConfig?.range || null)
      setAnalytics(data)
    } catch (err) {
      console.error('Error loading analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const destroyCharts = () => {
    if (donutChartInstanceRef.current) {
      donutChartInstanceRef.current.destroy()
      donutChartInstanceRef.current = null
    }
    if (weeklyChartInstanceRef.current) {
      weeklyChartInstanceRef.current.destroy()
      weeklyChartInstanceRef.current = null
    }
    if (forecastChartInstanceRef.current) {
      forecastChartInstanceRef.current.destroy()
      forecastChartInstanceRef.current = null
    }
  }

  const renderCharts = () => {
    renderDonutChart()
    renderWeeklyVisitsChart()
    renderForecastChart()
  }

  const entDistribution = useMemo(() => buildEntDistribution(analytics), [analytics])
  const weeklySeries = useMemo(() => buildWeeklySeries(analytics), [analytics])
  const timeSeries = useMemo(() => buildTimeSeries(analytics, filterConfig), [analytics, filterConfig])
  const forecastSeries = useMemo(() => generateForecastSeries(timeSeries), [timeSeries])
  const summaryCards = useMemo(
    () => buildSummaryCards(analytics, timeSeries, forecastSeries.summary, filterConfig),
    [analytics, timeSeries, forecastSeries.summary, filterConfig]
  )
  const descriptiveInsights = useMemo(
    () => buildDescriptiveInsights(analytics, weeklySeries, entDistribution, timeSeries, filterConfig),
    [analytics, weeklySeries, entDistribution, timeSeries, filterConfig]
  )
  const predictiveInsights = useMemo(
    () => buildPredictiveInsights(forecastSeries.summary),
    [forecastSeries.summary]
  )

  const renderDonutChart = () => {
    if (!donutChartRef.current) return
    const ctx = donutChartRef.current.getContext('2d')
    const data = entDistribution.map(item => item.value)
    if (donutChartInstanceRef.current) donutChartInstanceRef.current.destroy()

    donutChartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: entDistribution.map(item => item.label),
        datasets: [
          {
            data,
            backgroundColor: entDistribution.map(item => item.color),
            borderWidth: 2,
            borderColor: '#fff',
            hoverBorderColor: '#f8fafc'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 16, color: '#0f172a' }
          },
          tooltip: {
            callbacks: {
              label(context) {
                const value = context.raw || 0
                const total = data.reduce((sum, item) => sum + item, 0)
                const pct = total ? Math.round((value / total) * 100) : 0
                return `${context.label}: ${value} (${pct}%)`
              }
            }
          }
        }
      }
    })
  }

  const renderWeeklyVisitsChart = () => {
    if (!weeklyChartRef.current) return
    const ctx = weeklyChartRef.current.getContext('2d')
    if (weeklyChartInstanceRef.current) weeklyChartInstanceRef.current.destroy()

    weeklyChartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeklySeries.map(item => item.label),
        datasets: [
          {
            label: 'Visits',
            data: weeklySeries.map(item => item.visits),
            backgroundColor: 'rgba(76, 159, 254, 0.25)',
            borderColor: '#4c9ffe',
            borderWidth: 2,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#475569' } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: Math.max(Math.ceil(getMaxValue(weeklySeries) / 5), 1), color: '#475569' },
            grid: { color: 'rgba(226, 232, 240, 0.7)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#fff',
            bodyColor: '#cbd5f5'
          }
        }
      }
    })
  }

  const renderForecastChart = () => {
    if (!forecastChartRef.current || !forecastSeries.labels.length) return
    const ctx = forecastChartRef.current.getContext('2d')
    if (forecastChartInstanceRef.current) forecastChartInstanceRef.current.destroy()

    forecastChartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: forecastSeries.labels,
        datasets: [
          {
            label: 'Actual',
            data: forecastSeries.actualDataset,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            borderWidth: 3,
            fill: true,
            spanGaps: true
          },
          {
            label: 'Forecast',
            data: forecastSeries.forecastDataset,
            borderColor: '#f97316',
            borderDash: [6, 6],
            borderWidth: 3,
            pointRadius: 0,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#475569', maxRotation: 0 } },
          y: {
            beginAtZero: true,
            ticks: { color: '#475569' },
            grid: { color: 'rgba(226, 232, 240, 0.7)' }
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#0f172a' } },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#fff',
            bodyColor: '#cbd5f5'
          }
        }
      }
    })
  }

  const applyPresetFilter = (value) => {
    const range = value === 'all' ? null : getPresetRange(value)
    setFilterConfig({ type: 'preset', value, range })
    setShowCustomRange(false)
  }

  const applyCustomRange = () => {
    if (!customStart || !customEnd) {
      alert('Please select both start and end dates')
      return
    }
    const startDate = new Date(customStart)
    const endDate = new Date(customEnd)
    if (startDate > endDate) {
      alert('Start date must be before end date')
      return
    }
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    setFilterConfig({
      type: 'custom',
      value: 'custom',
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    })
    setShowCustomRange(false)
    setCustomStart('')
    setCustomEnd('')
  }

  const currentRangeLabel = getRangeLabel(filterConfig)
  const customRangeDescription = getCustomRangeDescription(filterConfig)

  return (
    <div className="page-content" style={{ color: '#0f172a', paddingRight: '10rem' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '12px' }}>Analytics</h2>
        <p style={{ color: '#475569', marginBottom: 0 }}>
          Descriptive and predictive insights for {currentRangeLabel.toLowerCase()}
          {customRangeDescription ? ` (${customRangeDescription})` : ''}
        </p>
      </div>

      <div
        className="filter-buttons"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: showCustomRange ? '12px' : '24px'
        }}
      >
        {['all', 'today', 'week', 'month'].map((value) => (
          <button
            key={value}
            className={`filter-btn ${filterConfig?.value === value ? 'active' : ''}`}
            onClick={() => applyPresetFilter(value)}
            style={{
              padding: '10px 18px',
              borderRadius: '999px',
              border: '1px solid rgba(148, 163, 184, 0.6)',
              background: filterConfig?.value === value ? '#0f172a' : '#fff',
              color: filterConfig?.value === value ? '#fff' : '#0f172a',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            {FILTER_LABELS[value]}
          </button>
        ))}
        <button
          className={`filter-btn ${showCustomRange ? 'active' : ''}`}
          onClick={() => setShowCustomRange((prev) => !prev)}
          style={{
            padding: '10px 18px',
            borderRadius: '999px',
            border: showCustomRange ? '1px solid #0f172a' : '1px solid rgba(148, 163, 184, 0.6)',
            background: showCustomRange ? '#0f172a' : '#fff',
            color: showCustomRange ? '#fff' : '#0f172a',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          Custom Range
        </button>
      </div>

      {showCustomRange && (
        <div style={{ ...PANEL_STYLE, padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                From
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={dateInputStyle}
              />
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                To
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={dateInputStyle}
              />
            </div>
            <button className="btn btn-primary" onClick={applyCustomRange} style={primaryBtnStyle}>
              Apply
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowCustomRange(false)}
              style={{ ...primaryBtnStyle, background: '#e2e8f0', color: '#0f172a' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading analytics…</div>
      ) : analytics ? (
        <>
          <section
            className="summary-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}
          >
            {summaryCards.map((card) => (
              <div key={card.title} style={{ ...PANEL_STYLE, padding: '20px' }}>
                <p style={{ margin: 0, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                  {card.title}
                </p>
                <h3 style={{ margin: '12px 0 4px', fontSize: '2rem' }}>{card.value}</h3>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>{card.helper}</p>
              </div>
            ))}
          </section>

          <section
            className="charts-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}
          >
            <div style={PANEL_STYLE}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0 }}>ENT Distribution</h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Case mix</span>
              </div>
              <div style={{ height: '320px', position: 'relative' }}>
                <canvas ref={donutChartRef} />
              </div>
            </div>

            <div style={PANEL_STYLE}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0 }}>Weekly Visits</h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Monday–Sunday</span>
              </div>
              <div style={{ height: '320px' }}>
                <canvas ref={weeklyChartRef} />
              </div>
            </div>
          </section>

          <section
            className="insights-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}
          >
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>Descriptive Insights</h3>
              <ul style={{ paddingLeft: '20px', margin: 0, color: '#475569', lineHeight: 1.6 }}>
                {descriptiveInsights.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '8px' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div style={PANEL_STYLE}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>Predictive Outlook</h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>7-day forecast</span>
              </div>
              <div style={{ height: '320px', marginBottom: '16px' }}>
                <canvas ref={forecastChartRef} />
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div style={forecastStatPillStyle}>
                  <p style={forecastStatLabelStyle}>Next 7 Days</p>
                  <p style={forecastStatValueStyle}>{forecastSeries.summary.total} visits</p>
                </div>
                <div style={forecastStatPillStyle}>
                  <p style={forecastStatLabelStyle}>Peak</p>
                  <p style={forecastStatValueStyle}>
                    {forecastSeries.summary.peakDay} · {forecastSeries.summary.peakValue} visits
                  </p>
                </div>
                <div style={forecastStatPillStyle}>
                  <p style={forecastStatLabelStyle}>Slowest</p>
                  <p style={forecastStatValueStyle}>
                    {forecastSeries.summary.minDay} · {forecastSeries.summary.minValue} visits
                  </p>
                </div>
              </div>
              <ul style={{ paddingLeft: '20px', margin: 0, color: '#475569', lineHeight: 1.6 }}>
                {predictiveInsights.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          No analytics available for the selected range.
        </div>
      )}
    </div>
  )
}

const dateInputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(148, 163, 184, 0.8)',
  fontSize: '0.95rem'
}

const primaryBtnStyle = {
  padding: '10px 18px',
  borderRadius: '12px',
  border: 'none',
  background: '#0f172a',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer'
}

const forecastStatPillStyle = {
  flex: '1 1 120px',
  background: 'rgba(99, 102, 241, 0.08)',
  borderRadius: '12px',
  padding: '12px 14px'
}

const forecastStatLabelStyle = { margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }
const forecastStatValueStyle = { margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }

const getRangeLabel = (filterConfig) => {
  if (filterConfig?.type === 'preset') return FILTER_LABELS[filterConfig.value] || 'Selected Range'
  if (filterConfig?.type === 'custom') return 'Custom Range'
  return 'All Time'
}

const getCustomRangeDescription = (filterConfig) => {
  if (filterConfig?.type !== 'custom' || !filterConfig.range) return ''
  const { startDate, endDate } = filterConfig.range
  if (!startDate || !endDate) return ''
  return `${formatDateLabel(startDate)} → ${formatDateLabel(endDate)}`
}

const getPresetRange = (range) => {
  const today = new Date()
  let startDate = null
  let endDate = null

  switch (range) {
    case 'today':
      startDate = new Date(today)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)
      break
    case 'week': {
      startDate = startOfWeek(today)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
      break
    }
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
      break
    default:
      break
  }

  return startDate && endDate
    ? {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    : null
}

const startOfWeek = (baseDate = new Date()) => {
  const date = new Date(baseDate)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const getNextMondayMidnight = () => {
  const date = startOfWeek()
  date.setDate(date.getDate() + 7)
  return date
}

const buildEntDistribution = (analytics) => {
  const visits = analytics?.visits || []
  if (!visits.length) {
    return [
      { key: 'ear', label: 'Ear', value: analytics?.entCounts?.ear || 0, color: ENT_COLORS.ear },
      { key: 'nose', label: 'Nose', value: analytics?.entCounts?.nose || 0, color: ENT_COLORS.nose },
      { key: 'throat', label: 'Throat', value: analytics?.entCounts?.throat || 0, color: ENT_COLORS.throat }
    ]
  }

  const counts = visits.reduce(
    (acc, visit) => {
      const type = (visit.diagnosisType || '').toLowerCase()
      if (type === 'ear' || type === 'nose' || type === 'throat') {
        acc[type] += 1
      } else {
        acc.other += 1
      }
      return acc
    },
    { ear: 0, nose: 0, throat: 0, other: 0 }
  )

  const distribution = [
    { key: 'ear', label: 'Ear Visits', value: counts.ear, color: ENT_COLORS.ear },
    { key: 'nose', label: 'Nose Visits', value: counts.nose, color: ENT_COLORS.nose },
    { key: 'throat', label: 'Throat Visits', value: counts.throat, color: ENT_COLORS.throat }
  ]

  if (counts.other > 0) {
    distribution.push({ key: 'other', label: 'Unspecified', value: counts.other, color: ENT_COLORS.other })
  }

  return distribution
}

const buildWeeklySeries = (analytics) => {
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const map = {}
  ;(analytics?.dailyVisits || []).forEach((entry) => {
    map[entry.day] = entry.visits || 0
  })
  return order.map((label) => ({ label, visits: map[label] || 0 }))
}

const buildTimeSeries = (analytics, filterConfig) => {
  if (!analytics) return []
  if (Array.isArray(analytics.visits) && analytics.visits.length) {
    const grouped = analytics.visits.reduce((acc, visit) => {
      if (!visit.date) return acc
      const dateKey = new Date(visit.date).toISOString().slice(0, 10)
      acc[dateKey] = (acc[dateKey] || 0) + 1
      return acc
    }, {})
    return Object.entries(grouped)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([isoDate, visits]) => ({
        isoDate,
        label: formatDateLabel(isoDate),
        visits
      }))
  }
  if (Array.isArray(analytics.dailyVisits) && analytics.dailyVisits.length) {
    const start = filterConfig?.range?.startDate ? new Date(filterConfig.range.startDate) : startOfWeek()
    return analytics.dailyVisits.map((entry, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return {
        isoDate: date.toISOString().slice(0, 10),
        label: formatDateLabel(date),
        visits: entry.visits || 0
      }
    })
  }
  return []
}

const generateForecastSeries = (series) => {
  if (!series.length) {
    return {
      labels: [],
      actualDataset: [],
      forecastDataset: [],
      summary: { total: 0, peakDay: 'N/A', peakValue: 0, minDay: 'N/A', minValue: 0 }
    }
  }

  const historical = series.slice(-14)
  const labels = historical.map((point) => point.label)
  const actualData = historical.map((point) => point.visits)
  const diffs = []
  for (let i = 1; i < historical.length; i += 1) {
    diffs.push(historical[i].visits - historical[i - 1].visits)
  }
  const avgChange = diffs.length ? diffs.reduce((sum, val) => sum + val, 0) / diffs.length : 0
  let lastDate = new Date(historical[historical.length - 1].isoDate)
  let lastValue = historical[historical.length - 1].visits
  const forecastPoints = []
  for (let i = 0; i < 7; i += 1) {
    lastDate = addDays(lastDate, 1)
    lastValue = Math.max(0, Math.round(lastValue + avgChange))
    forecastPoints.push({
      label: formatDateLabel(lastDate),
      value: lastValue
    })
  }

  const futureLabels = forecastPoints.map((point) => point.label)
  const combinedLabels = [...labels, ...futureLabels]
  const actualDataset = [...actualData, ...new Array(forecastPoints.length).fill(null)]
  const historicalLength = historical.length
  const forecastDataset = [
    ...new Array(Math.max(historicalLength - 1, 0)).fill(null),
    historical[historicalLength - 1].visits,
    ...forecastPoints.map((point) => point.value)
  ]

  const totalForecast = forecastPoints.reduce((sum, point) => sum + point.value, 0)
  const peakPoint = forecastPoints.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), forecastPoints[0])
  const minPoint = forecastPoints.reduce((prev, curr) => (curr.value < prev.value ? curr : prev), forecastPoints[0])

  return {
    labels: combinedLabels,
    actualDataset,
    forecastDataset,
    summary: {
      total: totalForecast,
      peakDay: peakPoint?.label || 'N/A',
      peakValue: peakPoint?.value || 0,
      minDay: minPoint?.label || 'N/A',
      minValue: minPoint?.value || 0
    }
  }
}

const buildSummaryCards = (analytics, timeSeries, forecastSummary, filterConfig) => {
  const rangeLabel = getRangeLabel(filterConfig)
  const totalVisits = analytics?.totalVisits || 0
  const avgDaily =
    timeSeries.length > 0 ? (timeSeries.reduce((sum, day) => sum + day.visits, 0) / timeSeries.length).toFixed(1) : '0.0'
  const busiestDay = timeSeries.reduce(
    (prev, curr) => (curr.visits > (prev?.visits || 0) ? curr : prev),
    timeSeries[0] || null
  )

  return [
    {
      title: 'Total Patients',
      value: formatNumber(analytics?.totalPatients || 0),
      helper: 'Registered in the system'
    },
    {
      title: `Visits · ${rangeLabel}`,
      value: formatNumber(totalVisits),
      helper: 'Completed consultations'
    },
    {
      title: 'Avg Daily Visits',
      value: avgDaily,
      helper: busiestDay ? `Peak: ${busiestDay.label} (${busiestDay.visits})` : 'No daily data available'
    },
    {
      title: 'Forecast (7 days)',
      value: `${forecastSummary.total} visits`,
      helper: `Peak: ${forecastSummary.peakDay}`
    }
  ]
}

const buildDescriptiveInsights = (analytics, weeklySeries, entDistribution, timeSeries, filterConfig) => {
  const totalCases = entDistribution.reduce((sum, item) => sum + item.value, 0)
  const topDiagnosis = entDistribution.reduce(
    (prev, curr) => (curr.value > (prev?.value || 0) ? curr : prev),
    entDistribution[0] || null
  )
  const busiestDay = weeklySeries.reduce(
    (prev, curr) => (curr.visits > (prev?.visits || 0) ? curr : prev),
    weeklySeries[0] || null
  )
  const quietDay = weeklySeries.reduce(
    (prev, curr) => (curr.visits < (prev?.visits ?? Infinity) ? curr : prev),
    weeklySeries[0] || null
  )
  const avgDaily =
    timeSeries.length > 0 ? (timeSeries.reduce((sum, day) => sum + day.visits, 0) / timeSeries.length).toFixed(1) : '0.0'
  const rangeLabel = getRangeLabel(filterConfig).toLowerCase()

  return [
    topDiagnosis && topDiagnosis.value
      ? `${topDiagnosis.label} cases lead with ${topDiagnosis.value} visits (${formatPercent(topDiagnosis.value, totalCases)} of volume).`
      : 'No ENT case mix recorded for this selection.',
    busiestDay ? `${busiestDay.label} is the busiest day (${busiestDay.visits} visits) while ${quietDay?.label} is the lightest.` : 'No day-of-week pattern detected yet.',
    `Average load is ${avgDaily} visits/day for this ${rangeLabel}.`
  ]
}

const buildPredictiveInsights = (summary) => {
  if (!summary) return ['Not enough signal to generate a forecast yet.']
  return [
    `Projected demand is ${summary.total} visits over the next 7 days.`,
    `Peak demand likely on ${summary.peakDay} (~${summary.peakValue} visits).`,
    `Slowest day expected on ${summary.minDay} (~${summary.minValue} visits).`
  ]
}

const addDays = (baseDate, days) => {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + days)
  return date
}

const formatDateLabel = (input) => {
  const date = input instanceof Date ? input : new Date(input)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const formatNumber = (value) => value.toLocaleString()

const formatPercent = (part, total) => {
  if (!total) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

const getMaxValue = (series) => series.reduce((max, point) => Math.max(max, point.visits || 0), 0)