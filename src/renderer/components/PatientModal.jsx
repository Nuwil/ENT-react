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
                <div className="form-section-title">Personal Information</div>
                <div className="form-group">
                    <label>Name *</label>
                    <input type="text" placeholder="Enter patient name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-row">
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
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Age</label>
                        <input type="number" placeholder="Age in years" value={formData.age || ''} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} />
                    </div>
                    <div className="form-group">
                        <label>Occupation</label>
                        <input type="text" placeholder="Occupation" value={formData.occupation || ''} onChange={e => setFormData({...formData, occupation: e.target.value})} />
                    </div>
                </div>
                
                <div className="form-section-title">Physical Information</div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Height (cm)</label>
                        <input type="number" placeholder="Height in cm" value={formData.height || ''} onChange={e => setFormData({...formData, height: parseFloat(e.target.value)})} />
                    </div>
                    <div className="form-group">
                        <label>Weight (kg)</label>
                        <input type="number" placeholder="Weight in kg" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})} />
                    </div>
                </div>
                
                <div className="form-section-title">Contact Information</div>
                <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" placeholder="Phone number" value={formData.contact || ''} onChange={e => setFormData({...formData, contact: e.target.value})} />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="Email address" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                
                <div className="form-section-title">Address</div>
                <div className="form-group">
                    <label>Street Address</label>
                    <input type="text" placeholder="Street address" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>City</label>
                        <input type="text" placeholder="City" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>State/Province</label>
                        <input type="text" placeholder="State or Province" value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Postal Code</label>
                        <input type="text" placeholder="Postal code" value={formData.postalCode || ''} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Country</label>
                        <input type="text" placeholder="Country" value={formData.country || ''} onChange={e => setFormData({...formData, country: e.target.value})} />
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
