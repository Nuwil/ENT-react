import { useState, useEffect } from 'react'

export default function PatientProfilePage({ patientId, onBack, onShowTimelineModal, onEditPatient }) {
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
    <div className="page-content" style={{paddingRight: '10rem'}}>
      <div className="profile-header-bar">
        <button onClick={onBack} className="btn btn-secondary">← Back</button>
        <h2>{patient.name}</h2>
        <div className="header-actions">
          <button onClick={() => onEditPatient(patient)} className="btn btn-primary">✎ Edit</button>
          <button onClick={onShowTimelineModal} className="btn btn-primary">+ Add Visit</button>
        </div>
      </div>

      <div className="patient-info-container">
        <div className="info-section">
          <h4 className="section-title">Personal Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name</span>
              <span className="info-value">{patient.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Gender</span>
              <span className="info-value">{patient.gender || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Birth Date</span>
              <span className="info-value">{patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Age</span>
              <span className="info-value">{patient.age || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Occupation</span>
              <span className="info-value">{patient.occupation || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="info-divider"></div>

        <div className="info-section">
          <h4 className="section-title">Physical Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Height</span>
              <span className="info-value">{patient.height ? patient.height + ' cm' : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Weight</span>
              <span className="info-value">{patient.weight ? patient.weight + ' kg' : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="info-divider"></div>

        <div className="info-section">
          <h4 className="section-title">Contact Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Phone</span>
              <span className="info-value">{patient.contact || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{patient.email || 'N/A'}</span>
            </div>
          </div>
        </div>

        {(patient.address || patient.city || patient.state || patient.country) && (
          <>
            <div className="info-divider"></div>
            <div className="info-section">
              <h4 className="section-title">Address</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Street Address</span>
                  <span className="info-value">{patient.address || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">City</span>
                  <span className="info-value">{patient.city || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">State/Province</span>
                  <span className="info-value">{patient.state || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Postal Code</span>
                  <span className="info-value">{patient.postalCode || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Country</span>
                  <span className="info-value">{patient.country || 'N/A'}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="timeline-section">
        <div className="timeline-header">
          <h3>Medical Timeline</h3>
        </div>
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
                <td><span className="type-badge">{v.diagnosisType}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
