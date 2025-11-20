import { useState, useEffect, useRef } from 'react'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, BarController } from 'chart.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController, BarController)

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [currentFilter, setCurrentFilter] = useState(null)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const donutChartRef = useRef(null)
  const dailyChartRef = useRef(null)
  const donutChartInstanceRef = useRef(null)
  const dailyChartInstanceRef = useRef(null)

  useEffect(() => {
    loadAnalytics()
  }, [currentFilter])

  const loadAnalytics = async () => {
    try {
      const data = await window.electronAPI.getAnalytics(currentFilter)
      setAnalytics(data)
    } catch (err) {
      console.error('Error loading analytics:', err)
    }
  }

  useEffect(() => {
    if (analytics) {
      setTimeout(() => {
        renderDonutChart()
        renderDailyVisitsChart()
      }, 100)
    }
  }, [analytics])

  const ensureChartReady = async (timeout = 5000) => {
    if (window.Chart) return
    
    // Try dynamic import
    try {
      const ChartModule = await import('chart.js')
      window.Chart = ChartModule.default || ChartModule.Chart || ChartModule
      return
    } catch (err) {
      console.warn('Failed to import Chart.js via ESM:', err)
    }
    
    // Fallback: wait for script tag to load
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (window.Chart) return
      await new Promise(r => setTimeout(r, 100))
    }
    throw new Error('Chart.js not available')
  }

  const renderDonutChart = async () => {
    if (!analytics) return
    try {
      await ensureChartReady()
      if (donutChartInstanceRef.current) donutChartInstanceRef.current.destroy()
      const ctx = donutChartRef.current?.getContext('2d')
      if (!ctx) return
      donutChartInstanceRef.current = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Ear', 'Nose', 'Throat'],
          datasets: [{ data: [analytics.entCounts.ear, analytics.entCounts.nose, analytics.entCounts.throat], backgroundColor: ['#e74c3c', '#3498db', '#27ae60'] }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 15, font: { size: 12 }, color: '#2c3e50' }
            }
          }
        }
      })
    } catch (err) {
      console.error('Failed to render donut chart', err)
    }
  }

  const renderDailyVisitsChart = async () => {
    if (!analytics) return
    try {
      await ensureChartReady()
      if (dailyChartInstanceRef.current) dailyChartInstanceRef.current.destroy()
      const ctx = dailyChartRef.current?.getContext('2d')
      if (!ctx) return
      dailyChartInstanceRef.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: analytics.dailyVisits.map(d => d.day),
          datasets: [{ label: 'Daily Visits', data: analytics.dailyVisits.map(d => d.visits), backgroundColor: '#3498db' }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } },
          plugins: {
            legend: {
              position: 'top',
              labels: { padding: 15, font: { size: 12 }, color: '#2c3e50' }
            }
          }
        }
      })
    } catch (err) {
      console.error('Failed to render daily visits chart', err)
    }
  }

  const applyPresetFilter = (range) => {
    const today = new Date()
    let startDate, endDate
    switch (range) {
      case 'today':
        startDate = new Date(today)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'week':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - today.getDay())
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today)
        endDate.setDate(today.getDate() + (6 - today.getDay()))
        endDate.setHours(23, 59, 59, 999)
        break
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'all':
        startDate = null
        endDate = null
        break
    }
    setShowCustomRange(false)
    setCurrentFilter(startDate || endDate ? { startDate, endDate } : null)
  }

  const applyCustomRange = () => {
    if (!customStart || !customEnd) {
      alert('Please select both dates')
      return
    }
    const startDate = new Date(customStart)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(customEnd)
    endDate.setHours(23, 59, 59, 999)
    setCurrentFilter({ startDate, endDate })
    setShowCustomRange(false)
  }

  return (
    <div className="page-content">
      <h2>Analytics</h2>
      <div className="filter-buttons">
        <button className="filter-btn" onClick={() => applyPresetFilter('today')}>Today</button>
        <button className="filter-btn" onClick={() => applyPresetFilter('week')}>Week</button>
        <button className="filter-btn" onClick={() => applyPresetFilter('month')}>Month</button>
        <button className="filter-btn" onClick={() => applyPresetFilter('all')}>All Time</button>
        <button className="filter-btn" onClick={() => setShowCustomRange(!showCustomRange)}>Custom Range</button>
      </div>
      {showCustomRange && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            <button className="btn btn-primary" onClick={applyCustomRange}>Apply</button>
            <button className="btn btn-secondary" onClick={() => setShowCustomRange(false)}>Cancel</button>
          </div>
        </div>
      )}
      {analytics && (
        <>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-value">{analytics.totalPatients}</div>
              <div className="stat-label">Total Patients</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.totalVisits}</div>
              <div className="stat-label">Total Visits</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.entCounts.ear}</div>
              <div className="stat-label">Ear</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.entCounts.nose}</div>
              <div className="stat-label">Nose</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.entCounts.throat}</div>
              <div className="stat-label">Throat</div>
            </div>
          </div>
          <div className="charts">
            <div className="chart-card">
              <h3>ENT Distribution</h3>
              <canvas width={528} ref={donutChartRef}></canvas>
            </div>
            <div className="chart-card">
              <h3>Daily Visits</h3>
              <canvas width={528} height={300} ref={dailyChartRef}></canvas>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
