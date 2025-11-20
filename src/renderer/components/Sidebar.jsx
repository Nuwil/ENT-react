export default function Sidebar({ currentPage, onPageChange }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="/src/renderer/assets/images/ENT-logo.png" alt="ENT Logo" className="logo" />
      </div>
      <nav className="sidebar-nav">
        <button className={`nav-btn ${currentPage === 'patients' ? 'active' : ''}`} onClick={() => onPageChange('patients')}>
          <span className="icon"></span>
          <span>Patient List</span>
        </button>
        <button className={`nav-btn ${currentPage === 'analytics' ? 'active' : ''}`} onClick={() => onPageChange('analytics')}>
          <span className="icon"></span>
          <span>Analytics</span>
        </button>
      </nav>
    </div>
  )
}
