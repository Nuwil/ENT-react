import { useState, useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [filterConfig, setFilterConfig] = useState({ type: 'preset', value: 'all' })
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const donutChartRef = useRef(null)
  const dailyChartRef = useRef(null)
  const donutChartInstanceRef = useRef(null)
  const dailyChartInstanceRef = useRef(null)

  useEffect(() => {
    loadAnalytics()
  }, [filterConfig])

  useEffect(() => {
    applyPresetFilter('all')
  }, [])

  useEffect(() => {
    if (filterConfig?.type !== 'preset' || filterConfig.value !== 'week') return

    const timeoutDuration = getNextMondayMidnight() - new Date()
    if (timeoutDuration <= 0) return

    const resetTimeout = setTimeout(() => {
      setFilterConfig((prev) => {
        if (prev?.type === 'preset' && prev.value === 'week') {
          return { ...prev, refreshKey: Date.now() }
        }
        return prev
      })
      setAnalytics(null)
    }, timeoutDuration)

    return () => clearTimeout(resetTimeout)
  }, [filterConfig])

  const getNextMondayMidnight = () => {
    const now = new Date()
    const nextMonday = new Date(now)
    const day = now.getDay() // Sunday 0 ... Saturday 6
    const mondayIndex = day === 0 ? 6 : day - 1
    const daysUntilNextMonday = 7 - mondayIndex
    nextMonday.setDate(now.getDate() + daysUntilNextMonday)
    nextMonday.setHours(0, 0, 0, 0)
    return nextMonday
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
        startDate = new Date(today)
        const day = today.getDay()
        const diff = day === 0 ? -6 : 1 - day
        startDate.setDate(today.getDate() + diff)
        startDate.setHours(0, 0, 0, 0)

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

  const buildFilterPayload = (filter) => {
    if (!filter) return null
    if (filter.type === 'preset') {
      if (filter.value === 'all') return null
      return getPresetRange(filter.value)
    }
    if (filter.type === 'custom') {
      return {
        startDate: filter.startDate,
        endDate: filter.endDate
      }
    }
    return null
  }

  const loadAnalytics = async () => {
    try {
      const data = await window.electronAPI.getAnalytics(buildFilterPayload(filterConfig))
      console.log('Analytics data:', data) // Debug log
      setAnalytics(data)
    } catch (err) {
      console.error('Error loading analytics:', err)
    }
  }

  useEffect(() => {
    if (analytics) {
      renderCharts()
    }

    // Cleanup charts on unmount
    return () => {
      if (donutChartInstanceRef.current) {
        donutChartInstanceRef.current.destroy()
        donutChartInstanceRef.current = null
      }
      if (dailyChartInstanceRef.current) {
        dailyChartInstanceRef.current.destroy()
        dailyChartInstanceRef.current = null
      }
    }
  }, [analytics])

  const renderCharts = () => {
    renderDonutChart()
    renderDailyVisitsChart()
  }

  const renderDonutChart = () => {
    if (!analytics || !donutChartRef.current) {
      console.log('Donut chart: Missing analytics or canvas ref')
      return
    }

    try {
      // Destroy previous chart instance
      if (donutChartInstanceRef.current) {
        donutChartInstanceRef.current.destroy()
      }

      const ctx = donutChartRef.current.getContext('2d')
      
      // Ensure we have valid data for the donut chart
      const earCount = analytics.entCounts?.ear || 0
      const noseCount = analytics.entCounts?.nose || 0
      const throatCount = analytics.entCounts?.throat || 0

      console.log('Donut chart data:', { ear: earCount, nose: noseCount, throat: throatCount })

      const total = earCount + noseCount + throatCount

      donutChartInstanceRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Ear', 'Nose', 'Throat'],
          datasets: [{
            data: [earCount, noseCount, throatCount],
            backgroundColor: ['#e74c3c', '#3498db', '#27ae60'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { 
                padding: 15, 
                font: { size: 12 }, 
                color: '#2c3e50',
                usePointStyle: true
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      })

      // If no data, show a simple overlay message above the canvas
      const canvasParent = donutChartRef.current.parentElement
      let overlay = canvasParent.querySelector('.chart-no-data')
      if (total === 0) {
        if (!overlay) {
          overlay = document.createElement('div')
          overlay.className = 'chart-no-data'
          overlay.style.position = 'absolute'
          overlay.style.left = '0'
          overlay.style.top = '0'
          overlay.style.right = '0'
          overlay.style.bottom = '0'
          overlay.style.display = 'flex'
          overlay.style.alignItems = 'center'
          overlay.style.justifyContent = 'center'
          overlay.style.color = '#6c757d'
          overlay.style.fontSize = '16px'
          overlay.style.fontWeight = '600'
          overlay.style.pointerEvents = 'none'
          canvasParent.style.position = canvasParent.style.position || 'relative'
          canvasParent.appendChild(overlay)
        }
        overlay.textContent = 'No data for selected range'
      } else if (overlay) {
        overlay.remove()
      }
    } catch (err) {
      console.error('Failed to render donut chart:', err)
    }
  }

  const renderDailyVisitsChart = () => {
    if (!analytics || !dailyChartRef.current) {
      console.log('Daily chart: Missing analytics or canvas ref')
      return
    }

    try {
      // Destroy previous chart instance
      if (dailyChartInstanceRef.current) {
        dailyChartInstanceRef.current.destroy()
      }

      const ctx = dailyChartRef.current.getContext('2d')
      
      // Ensure we have valid data for daily visits
      const dailyVisits = analytics.dailyVisits || []
      const visitsData = dailyVisits.map(d => d.visits || 0)
      const labels = dailyVisits.map(d => d.day || 'Unknown')

      console.log('Daily visits data:', { labels, visits: visitsData })

      const maxVisits = Math.max(...visitsData, 1)
      const yMax = maxVisits <= 10 ? 10 : Math.ceil(maxVisits / 5) * 5

      dailyChartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Daily Visits',
            data: visitsData,
            backgroundColor: '#3498db',
            borderColor: '#2980b9',
            borderWidth: 1
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          scales: { 
            y: { 
              beginAtZero: true, 
              max: yMax, 
              ticks: { stepSize: yMax <= 10 ? 1 : 5 },
              title: {
                display: true,
                text: 'Number of Visits'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Days of Week'
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { 
                padding: 15, 
                font: { size: 12 }, 
                color: '#2c3e50' 
              }
            }
          }
        }
      })
    } catch (err) {
      console.error('Failed to render daily visits chart:', err)
    }
  }

  const applyPresetFilter = (range) => {
    setShowCustomRange(false)
    setFilterConfig({ type: 'preset', value: range, refreshKey: Date.now() })
    setAnalytics(null)
  }

  const applyCustomRange = () => {
    if (!customStart || !customEnd) {
      alert('Please select both start and end dates')
      return
    }

    const startDate = new Date(customStart)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(customEnd)
    endDate.setHours(23, 59, 59, 999)

    setFilterConfig({
      type: 'custom',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })
    setShowCustomRange(false)
    setCustomStart('')
    setCustomEnd('')
    
    // Force re-render
    setAnalytics(null)
  }

  const handleCustomRangeToggle = () => {
    setShowCustomRange(!showCustomRange)
    if (!showCustomRange) {
      // When opening custom range, clear any active filter
      setFilterConfig({ type: 'preset', value: 'all', refreshKey: Date.now() })
      setAnalytics(null)
    }
  }

  return (
    <div className="page-content">
      <h2>Analytics</h2>
      
      {/* Filter Buttons */}
      <div className="filter-buttons" style={{ marginBottom: '20px' }}>
        <button 
          className={`filter-btn ${
            filterConfig?.type === 'preset' && filterConfig.value === 'all' ? 'active' : ''
          }`} 
          onClick={() => applyPresetFilter('all')}
        >
          All Time
        </button>
        <button 
          className={`filter-btn ${
            filterConfig?.type === 'preset' && filterConfig.value === 'today' ? 'active' : ''
          }`} 
          onClick={() => applyPresetFilter('today')}
        >
          Today
        </button>
        <button 
          className={`filter-btn ${
            filterConfig?.type === 'preset' && filterConfig.value === 'week' ? 'active' : ''
          }`} 
          onClick={() => applyPresetFilter('week')}
        >
          This Week
        </button>
        <button 
          className={`filter-btn ${
            filterConfig?.type === 'preset' && filterConfig.value === 'month' ? 'active' : ''
          }`} 
          onClick={() => applyPresetFilter('month')}
        >
          This Month
        </button>
        <button 
          className={`filter-btn ${showCustomRange ? 'active' : ''}`} 
          onClick={handleCustomRangeToggle}
        >
          Custom Range
        </button>
      </div>

      {/* Custom Range Inputs */}
      {showCustomRange && (
        <div className="custom-range-container" style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                From Date:
              </label>
              <input 
                type="date" 
                value={customStart} 
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
                To Date:
              </label>
              <input 
                type="date" 
                value={customEnd} 
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <button 
              className="btn btn-primary" 
              onClick={applyCustomRange}
              style={{ padding: '8px 16px' }}
            >
              Apply Range
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowCustomRange(false)}
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Analytics Content */}
      {analytics ? (
        <>
          {/* Statistics Cards */}
          <div className="stats" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '15px', 
            marginBottom: '30px' 
          }}>
            <div className="stat-card" style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div className="stat-value" style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#2c3e50',
                marginBottom: '5px'
              }}>
                {analytics.totalPatients || 0}
              </div>
              <div className="stat-label" style={{ color: '#6c757d', fontSize: '14px' }}>
                Total Patients
              </div>
            </div>
            <div className="stat-card" style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div className="stat-value" style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#2c3e50',
                marginBottom: '5px'
              }}>
                {analytics.totalVisits || 0}
              </div>
              <div className="stat-label" style={{ color: '#6c757d', fontSize: '14px' }}>
                Total Visits
              </div>
            </div>
            <div className="stat-card" style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div className="stat-value" style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#e74c3c',
                marginBottom: '5px'
              }}>
                {analytics.entCounts?.ear || 0}
              </div>
              <div className="stat-label" style={{ color: '#6c757d', fontSize: '14px' }}>
                Ear Cases
              </div>
            </div>
            <div className="stat-card" style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div className="stat-value" style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#3498db',
                marginBottom: '5px'
              }}>
                {analytics.entCounts?.nose || 0}
              </div>
              <div className="stat-label" style={{ color: '#6c757d', fontSize: '14px' }}>
                Nose Cases
              </div>
            </div>
            <div className="stat-card" style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div className="stat-value" style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#27ae60',
                marginBottom: '5px'
              }}>
                {analytics.entCounts?.throat || 0}
              </div>
              <div className="stat-label" style={{ color: '#6c757d', fontSize: '14px' }}>
                Throat Cases
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="charts" style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px' 
          }}>
            <div className="chart-card" style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>ENT Distribution</h3>
              <div style={{ height: '300px' }}>
                <canvas ref={donutChartRef}></canvas>
              </div>
            </div>
            <div className="chart-card" style={{ 
              background: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Weekly Visits</h3>
              <div style={{ height: '300px' }}>
                <canvas ref={dailyChartRef}></canvas>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          Loading analytics data...
        </div>
      )}
    </div>
  )
}