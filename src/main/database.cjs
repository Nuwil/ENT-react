const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Database {
    constructor() {
        this.dataDir = path.join(app.getPath('userData'), 'data');
        this.dbFile = path.join(this.dataDir, 'database.json');
        this.initialize();
    }

    initialize() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.dbFile)) {
            const initialData = { patients: [], visits: [], settings: {} };
            this.writeData(initialData);
        }
    }

    readData() {
        try {
            return JSON.parse(fs.readFileSync(this.dbFile, 'utf8'));
        } catch (error) {
            return { patients: [], visits: [], settings: {} };
        }
    }

    writeData(data) {
        try {
            fs.writeFileSync(this.dbFile, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            return false;
        }
    }

    getPatients() { return this.readData().patients; }

    getPatient(id) {
        const data = this.readData();
        const patient = data.patients.find(p => p.id === id);
        if (patient) {
            const visits = data.visits.filter(v => v.patientId === id);
            return { ...patient, visits };
        }
        return null;
    }

    addPatient(patientData) {
        const data = this.readData();
        const newPatient = {
            id: uuidv4(),
            ...patientData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        data.patients.push(newPatient);
        return this.writeData(data) ? newPatient : null;
    }

    updatePatient(id, patientData) {
        const data = this.readData();
        const patientIndex = data.patients.findIndex(p => p.id === id);
        if (patientIndex === -1) return null;

        data.patients[patientIndex] = {
            ...data.patients[patientIndex],
            ...patientData,
            updatedAt: new Date().toISOString()
        };
        return this.writeData(data) ? data.patients[patientIndex] : null;
    }

    deletePatient(id) {
        const data = this.readData();
        const patientIndex = data.patients.findIndex(p => p.id === id);
        if (patientIndex === -1) return false;

        data.patients.splice(patientIndex, 1);
        data.visits = data.visits.filter(v => v.patientId !== id);
        return this.writeData(data);
    }

    addVisit(patientId, visitData) {
        const data = this.readData();
        const patient = data.patients.find(p => p.id === patientId);
        if (!patient) return null;

        const newVisit = {
            id: uuidv4(),
            patientId,
            ...visitData,
            date: new Date().toISOString()
        };
        data.visits.push(newVisit);
        return this.writeData(data) ? newVisit : null;
    }

    getAnalytics() {
        const data = this.readData();
        const entCounts = {
            ear: data.visits.filter(v => v.diagnosisType === 'ear').length,
            nose: data.visits.filter(v => v.diagnosisType === 'nose').length,
            throat: data.visits.filter(v => v.diagnosisType === 'throat').length
        };

        const dailyVisits = this.getWeeklyVisits(data.visits);

        return {
            entCounts,
            dailyVisits,
            totalPatients: data.patients.length,
            totalVisits: data.visits.length
        };
    }

    getAnalyticsWithFilter(startDate, endDate) {
        const data = this.readData();

        // Filter visits by date range
        let filteredVisits = data.visits;
        if (startDate && endDate) {
            filteredVisits = data.visits.filter(visit => {
                const visitDate = new Date(visit.date);
                return visitDate >= startDate && visitDate <= endDate;
            });
        }

        // ADD THESE DEBUG LOGS:
        console.log('=== DATABASE DEBUG ===');
        console.log('Date range:', {
            start: startDate?.toISOString(),
            end: endDate?.toISOString()
        });
        console.log('Total visits found:', filteredVisits.length);

        // Log each visit's details
        filteredVisits.forEach(visit => {
            console.log('Visit:', {
                date: visit.date,
                diagnosisType: visit.diagnosisType,
                diagnosis: visit.diagnosis,
                chiefComplaint: visit.chiefComplaint
            });
        });

        const entCounts = {
            ear: filteredVisits.filter(v => v.diagnosisType === 'ear').length,
            nose: filteredVisits.filter(v => v.diagnosisType === 'nose').length,
            throat: filteredVisits.filter(v => v.diagnosisType === 'throat').length
        };

        console.log('Final ENT counts:', entCounts);
        console.log('=====================');

        const dailyVisits = this.getWeeklyVisits(filteredVisits);

        return {
            entCounts,
            dailyVisits,
            totalPatients: data.patients.length,
            totalVisits: filteredVisits.length,
            visits: filteredVisits
        };
    }

    getWeeklyVisits(visits, startDate = null, endDate = null) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weekVisits = Array(7).fill(0);

        let rangeStart = startDate;
        let rangeEnd = endDate;

        if (!rangeStart || !rangeEnd) {
            rangeEnd = new Date();
            rangeStart = new Date();
            rangeStart.setDate(rangeStart.getDate() - 7);
        }

        visits.forEach(visit => {
            const visitDate = new Date(visit.date);
            if (visitDate >= rangeStart && visitDate <= rangeEnd) {
                const dayIndex = visitDate.getDay();
                const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                weekVisits[adjustedIndex]++;
            }
        });

        return days.map((day, index) => ({ day, visits: weekVisits[index] }));
    }

    exportData() {
        const data = this.readData();
        const exportDir = path.join(app.getPath('desktop'), 'ENT_Export');
        if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const exportFile = path.join(exportDir, `ent_data_${timestamp}.json`);
        fs.writeFileSync(exportFile, JSON.stringify(data, null, 2));
        return exportFile;
    }
}

module.exports = Database;