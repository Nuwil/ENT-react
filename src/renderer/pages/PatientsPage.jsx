import { useState, useEffect } from 'react'

export default function PatientsPage({ onViewPatient, onShowModal, onEditPatient, onRefresh, refresh }) {
  const [patients, setPatients] = useState([])
  const [filteredPatients, setFilteredPatients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadPatients()
  }, [refresh])

  const loadPatients = async () => {
    try {
      const p = await window.electronAPI.getPatients()
      setPatients(p)
      setFilteredPatients(p)
    } catch (err) {
      console.error('Error loading patients:', err)
    }
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    if (!term.trim()) {
      setFilteredPatients(patients)
    } else {
      setFilteredPatients(patients.filter(p => 
        p.name.toLowerCase().includes(term.toLowerCase()) ||
        p.contact.includes(term) ||
        p.gender.toLowerCase().includes(term.toLowerCase())
      ))
    }
  }

  const handleDelete = async (id) => {
    const p = await window.electronAPI.getPatient(id)
    if (confirm(`Delete ${p.name}?`)) {
      await window.electronAPI.deletePatient(id)
      await loadPatients()
    }
  }

  return (
    <div className="page-content" style={{ paddingRight: '10rem'}}>
      <h2>Patient List</h2>
      <p>Manage patients and view their timeline</p>
      <div className="search-container">
        <div className="search-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input type="text" placeholder="Search patients..." className="search-input" value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
          <button className="search-clear" onClick={() => handleSearch('')}>×</button>
        </div>
        <div className="search-results-count">Showing {filteredPatients.length} of {patients.length} patients</div>
      </div>
      <button onClick={onShowModal} className="btn btn-primary">Add Patient</button>
      <table className="patients-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Gender</th>
            <th>Contact</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPatients.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.gender}</td>
              <td>{p.contact}</td>
              <td>
                <button className="action-btn view-btn" onClick={() => onViewPatient(p.id)}>View</button>
                <button className="action-btn edit-btn" onClick={() => onEditPatient(p)}>Edit</button>
                <button className="action-btn delete-btn" onClick={() => handleDelete(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
