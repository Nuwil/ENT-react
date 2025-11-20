import { useState } from 'react'

export default function PatientModal({ onClose, patient, onSaved }) {
  const [formData, setFormData] = useState(patient || {})

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (patient?.id) {
        await window.electronAPI.updatePatient(patient.id, formData)
      } else {
        await window.electronAPI.addPatient(formData)
      }
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('Error saving patient:', err)
      alert('Error saving patient')
    }
  }

return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{patient ? 'Edit Patient' : 'Add Patient'}</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Name *</label>
                    <input type="text" placeholder="Enter patient name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-group">
                    <label>Contact</label>
                    <input type="text" placeholder="Phone number or email" value={formData.contact || ''} onChange={e => setFormData({...formData, contact: e.target.value})} />
                </div>
                <div className="form-group">
                    <label>Gender</label>
                    <select value={formData.gender || ''} onChange={e => setFormData({...formData, gender: e.target.value})}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Birth Date</label>
                    <input type="date" value={formData.birthdate || ''} onChange={e => setFormData({...formData, birthdate: e.target.value})} />
                </div>
                <div className="form-group" style={{ display: 'flex', gap: '10px', flexDirection: 'row' }}>
                    <div style={{ flex: 1 }}>
                        <label>Age</label>
                        <input type="number" placeholder="Age in years" value={formData.age || ''} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>Height (cm)</label>
                        <input type="number" placeholder="Height in centimeters" value={formData.height || ''} onChange={e => setFormData({...formData, height: parseFloat(e.target.value)})} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>Weight (kg)</label>
                        <input type="number" placeholder="Weight in kilograms" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})} />
                    </div>
                </div>
                <div className="btn-group">
                    <button type="submit" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1rem' }}>Save</button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '1rem', fontSize: '1rem' }} onClick={onClose}>Cancel</button>
                </div>
            </form>
        </div>
    </div>
)
}
