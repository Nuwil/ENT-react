import { useState } from 'react'

export default function TimelineModal({ patientId, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    history: '',
    findings: '',
    diagnosis: '',
    plan: '',
    diagnosisType: 'Ear'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await window.electronAPI.addVisit(patientId, formData)
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('Error saving timeline:', err)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Add Timeline</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Chief Complaint *</label>
            <textarea placeholder="Describe the patient's main complaint" value={formData.chiefComplaint} onChange={e => setFormData({...formData, chiefComplaint: e.target.value})} required></textarea>
          </div>
          <div className="form-group">
            <label>History</label>
            <textarea placeholder="Medical history relevant to this visit" value={formData.history} onChange={e => setFormData({...formData, history: e.target.value})}></textarea>
          </div>
          <div className="form-group">
            <label>Findings</label>
            <textarea placeholder="Clinical examination findings" value={formData.findings} onChange={e => setFormData({...formData, findings: e.target.value})}></textarea>
          </div>
          <div className="form-group">
            <label>Diagnosis</label>
            <textarea placeholder="Diagnosis and assessment" value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})}></textarea>
          </div>
          <div className="form-group">
            <label>Plan</label>
            <textarea placeholder="Treatment plan and recommendations" value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value})}></textarea>
          </div>
          <div className="form-group">
            <label>Diagnosis Type *</label>
            <select value={formData.diagnosisType} onChange={e => setFormData({...formData, diagnosisType: e.target.value})}>
              <option value="Ear">Ear</option>
              <option value="Nose">Nose</option>
              <option value="Throat">Throat</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Save</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  )
}
