import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import PatientsPage from './pages/PatientsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import PatientProfilePage from './pages/PatientProfilePage'
import PatientModal from './components/PatientModal'
import TimelineModal from './components/TimelineModal'
import './App.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState('patients')
  const [currentPatientId, setCurrentPatientId] = useState(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [showTimelineModal, setShowTimelineModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)
  const [refreshPatients, setRefreshPatients] = useState(0)

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="main-content">
        {currentPage === 'patients' && <PatientsPage onViewPatient={(id) => { setCurrentPatientId(id); setCurrentPage('profile'); }} onShowModal={() => { setEditingPatient(null); setShowPatientModal(true); }} onEditPatient={(p) => { setEditingPatient(p); setShowPatientModal(true); }} onRefresh={() => setRefreshPatients(r => r + 1)} refresh={refreshPatients} />}
        {currentPage === 'analytics' && <AnalyticsPage />}
        {currentPage === 'profile' && <PatientProfilePage patientId={currentPatientId} onBack={() => setCurrentPage('patients')} onShowTimelineModal={() => setShowTimelineModal(true)} />}
      </div>
      {showPatientModal && <PatientModal onClose={() => { setShowPatientModal(false); setEditingPatient(null); }} onSaved={() => { setShowPatientModal(false); setEditingPatient(null); setRefreshPatients(r => r + 1); }} patient={editingPatient} />}
      {showTimelineModal && <TimelineModal patientId={currentPatientId} onClose={() => setShowTimelineModal(false)} onSaved={() => setRefreshPatients(r => r + 1)} />}
    </div>
  )
}
