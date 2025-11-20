import { useState, useEffect } from 'react'

export default function PatientProfilePage({ patientId, onBack, onShowTimelineModal }) {
  const [patient, setPatient] = useState(null)

  useEffect(() => {
    if (patientId) loadPatient()
  }, [patientId])

  const loadPatient = async () => {
    try {
      const p = await window.electronAPI.getPatient(patientId)
      setPatient(p)
    } catch (err) {
      console.error('Error loading patient:', err)
    }
  }

  if (!patient) return <div>Loading...</div>

  return (
    <div className="page-content">
      <button onClick={onBack} className="btn btn-secondary">Back</button>
      <h2>{patient.name}</h2>
      <div className="patient-details-grid">
        <div className="detail-column">
          <div className="detail-item">
            <span className="detail-label">Name:</span>
            <span className="detail-value">{patient.name}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Contact:</span>
            <span className="detail-value">{patient.contact}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Birth Date:</span>
            <span className="detail-value">{patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
        <div className="detail-column">
          <div className="detail-item">
            <span className="detail-label">Gender:</span>
            <span className="detail-value">{patient.gender}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Age:</span>
            <span className="detail-value">{patient.age || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Height:</span>
            <span className="detail-value">{patient.height ? patient.height + ' cm' : 'N/A'}</span>
          </div>
        </div>
      </div>
      <button onClick={onShowTimelineModal} className="btn btn-primary">Add Timeline</button>
      <table className="timeline-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Chief Complaint</th>
            <th>Diagnosis</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {(patient.visits || []).map((v, i) => (
            <tr key={i}>
              <td>{new Date(v.date).toLocaleDateString()}</td>
              <td>{v.chiefComplaint}</td>
              <td>{v.diagnosis}</td>
              <td>{v.diagnosisType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
