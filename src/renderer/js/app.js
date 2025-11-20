class ENTApp {
    constructor() {
        this.currentPatientId = null;
        this.currentFilter = null;
        this.allPatients = []; 
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadPatients();
        this.setupMenuListeners();
    }

    setupMenuListeners() {
        window.electronAPI.onMenuNewPatient(() => this.showPatientModal());
        window.electronAPI.onMenuExportData(() => this.exportData());
        window.electronAPI.onMenuShowPatients(() => this.showPage('patients'));
        window.electronAPI.onMenuShowAnalytics(() => this.showPage('analytics'));
    }

    bindEvents() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.showPage(e.target.dataset.page));
        });

        document.getElementById('add-patient-btn').addEventListener('click', () => this.showPatientModal());
        document.getElementById('back-to-list').addEventListener('click', () => this.showPage('patients'));
        document.getElementById('add-timeline-btn').addEventListener('click', () => this.showTimelineModal());
        document.getElementById('edit-patient-btn').addEventListener('click', () => this.editCurrentPatient());
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('download-pdf-btn').addEventListener('click', () => this.downloadPDF());

        // Date filter events
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.id === 'custom-range-btn') {
                    this.toggleCustomRange();
                } else {
                    this.applyPresetFilter(btn.dataset.range);
                }
            });
        });
        document.getElementById('apply-custom-range').addEventListener('click', () => this.applyCustomFilter());

        document.getElementById('cancel-patient').addEventListener('click', () => this.hideModal('patient-modal'));
        document.getElementById('cancel-timeline').addEventListener('click', () => this.hideModal('timeline-modal'));

        document.getElementById('patient-form').addEventListener('submit', (e) => this.savePatient(e));
        document.getElementById('timeline-form').addEventListener('submit', (e) => this.saveTimeline(e));
        document.getElementById('patient-search').addEventListener('input', (e) => this.searchPatients(e.target.value));
        document.getElementById('search-clear-btn').addEventListener('click', () => this.clearSearch());
    }

    // Date Filtering Methods
    toggleCustomRange() {
        const customSection = document.getElementById('custom-range-section');
        const isActive = customSection.classList.contains('active');

        // Toggle custom section
        customSection.classList.toggle('active');

        // Update button active state
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('custom-range-btn').classList.add('active');

        // If showing custom range, clear any current filter
        if (!isActive) {
            this.currentFilter = null;
            // Clear the analytics to show all data when custom range is opened
            this.loadAnalytics();
        }
    }

    applyPresetFilter(rangeOrEvent) {
        let range = rangeOrEvent;
        let targetBtn = null;
        const today = new Date();
        let startDate, endDate;

        // If called from an event, extract the range and target button
        if (rangeOrEvent && rangeOrEvent.target) {
            range = rangeOrEvent.target.dataset.range;
            targetBtn = rangeOrEvent.target;
        } else {
            targetBtn = document.querySelector(`.filter-btn[data-range="${range}"]`);
        }

        // Hide custom range section
        document.getElementById('custom-range-section').classList.remove('active');

        switch (range) {
            case 'today':
                // Today only
                startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999); // End of day
                break;
            case 'week':
                // This week (Sunday to Saturday)
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay()); // Sunday
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setDate(today.getDate() + (6 - today.getDay())); // Saturday
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                // This month (1st to last day)
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'all':
                // All time - no filter
                startDate = null;
                endDate = null;
                break;
        }

        // Update UI
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        if (targetBtn) targetBtn.classList.add('active');

        // Apply filter
        this.currentFilter = { startDate, endDate };
        this.loadAnalytics();
    }

    applyCustomFilter() {
        const startDateInput = document.getElementById('start-date').value;
        const endDateInput = document.getElementById('end-date').value;

        if (!startDateInput || !endDateInput) {
            alert('Please select both start and end dates');
            return;
        }

        // Set start date to beginning of day, end date to end of day
        const startDate = new Date(startDateInput);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(endDateInput);
        endDate.setHours(23, 59, 59, 999);

        this.currentFilter = {
            startDate: startDate,
            endDate: endDate
        };

        // Hide custom range after applying
        document.getElementById('custom-range-section').classList.remove('active');
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.loadAnalytics();
    }

    showPage(pageName) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });
        document.querySelectorAll('.page').forEach(page => {
            page.classList.toggle('active', page.id === `${pageName}-page`);
        });
        if (pageName === 'analytics') this.loadAnalytics();
    }

    searchPatients(searchTerm) {
        const filteredPatients = this.allPatients.filter(patient =>
            patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.contact.includes(searchTerm) ||
            patient.gender.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderPatients(filteredPatients);
        this.updateSearchResultsCount(filteredPatients.length, searchTerm);
    }

    clearSearch() {
        const searchInput = document.getElementById('patient-search');
        searchInput.value = '';
        searchInput.focus();
        this.searchPatients('');
    }

    updateSearchResultsCount(count, searchTerm) {
        const resultsCount = document.getElementById('search-results-count');
        if (searchTerm.trim() === '') {
            resultsCount.textContent = `Showing all ${count} patients`;
        } else {
            resultsCount.textContent = `Found ${count} patient${count !== 1 ? 's' : ''} matching "${searchTerm}"`;
        }
    }


    async loadPatients() {
        try {
            this.allPatients = await window.electronAPI.getPatients();
            this.renderPatients(this.allPatients);
            this.updateSearchResultsCount(this.allPatients.length, '');
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }

    renderPatients(patients) {
        const tbody = document.getElementById('patients-tbody');

        if (patients.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="4" class="no-results">
                    No patients found. Try a different search term or add a new patient.
                </td>
            </tr>
        `;
            return;
        }

        tbody.innerHTML = patients.map(patient => `
        <tr>
            <td>${patient.name}</td>
            <td>${patient.gender}</td>
            <td>${patient.contact}</td>
            <td>
                <button class="action-btn view-btn" onclick="app.viewPatient('${patient.id}')">View</button>
                <button class="action-btn edit-btn" onclick="app.editPatient('${patient.id}')">Edit</button>
                <button class="action-btn delete-btn" onclick="app.deletePatient('${patient.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
    }

    async viewPatient(patientId) {
        try {
            const patient = await window.electronAPI.getPatient(patientId);
            this.renderPatientProfile(patient);
            this.currentPatientId = patientId;
            this.showPage('patient-profile');
        } catch (error) {
            console.error('Error loading patient:', error);
        }
    }

    renderPatientProfile(patient) {
        const infoDiv = document.getElementById('patient-info');

        infoDiv.innerHTML = `
        <div class="patient-details-grid">
            <div class="detail-column">
                <div class="detail-item">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">${patient.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Contact:</span>
                    <span class="detail-value">${patient.contact}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Birth Date:</span>
                    <span class="detail-value">${patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Weight:</span>
                    <span class="detail-value">${patient.weight ? patient.weight + ' kg' : 'N/A'}</span>
                </div>
            </div>
            <div class="detail-column">
                <div class="detail-item">
                    <span class="detail-label">Gender:</span>
                    <span class="detail-value">${patient.gender}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Age:</span>
                    <span class="detail-value">${patient.age || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Height:</span>
                    <span class="detail-value">${patient.height ? patient.height + ' cm' : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Occupation:</span>
                    <span class="detail-value">${patient.occupation || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
        this.renderTimeline(patient.visits || []);
    }

    renderTimeline(visits) {
        const tbody = document.getElementById('timeline-tbody');
        tbody.innerHTML = visits.map(visit => `
            <tr>
                <td>${new Date(visit.date).toLocaleDateString()}</td>
                <td>${visit.chiefComplaint}</td>
                <td>${visit.diagnosis}</td>
                <td>${visit.diagnosisType}</td>
            </tr>
        `).join('');
    }

    showPatientModal(patient = null) {
        const modal = document.getElementById('patient-modal');
        const title = document.getElementById('modal-title');

        if (patient) {
            title.textContent = 'Edit Patient';
            this.fillPatientForm(patient);
        } else {
            title.textContent = 'Add Patient';
            document.getElementById('patient-form').reset();
        }

        modal.style.display = 'block';
    }

    fillPatientForm(patient) {
        document.getElementById('name').value = patient.name || '';
        document.getElementById('gender').value = patient.gender || '';
        document.getElementById('contact').value = patient.contact || '';
        document.getElementById('address').value = patient.address || '';
        document.getElementById('birthdate').value = patient.birthdate || '';
        document.getElementById('age').value = patient.age || '';
        document.getElementById('weight').value = patient.weight || '';
        document.getElementById('height').value = patient.height || '';
        document.getElementById('occupation').value = patient.occupation || '';
    }

    async savePatient(e) {
        e.preventDefault();

        const patientData = {
            name: document.getElementById('name').value,
            gender: document.getElementById('gender').value,
            contact: document.getElementById('contact').value,
            address: document.getElementById('address').value,
            birthdate: document.getElementById('birthdate').value,
            age: document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null,
            weight: document.getElementById('weight').value ? parseFloat(document.getElementById('weight').value) : null,
            height: document.getElementById('height').value ? parseFloat(document.getElementById('height').value) : null,
            occupation: document.getElementById('occupation').value
        };

        try {
            const isEdit = this.currentPatientId && document.getElementById('modal-title').textContent === 'Edit Patient';

            if (isEdit) {
                await window.electronAPI.updatePatient(this.currentPatientId, patientData);
            } else {
                await window.electronAPI.addPatient(patientData);
            }

            this.hideModal('patient-modal');
            await this.loadPatients();

            if (isEdit && this.currentPatientId) {
                await this.viewPatient(this.currentPatientId);
            }

            alert(`Patient ${isEdit ? 'updated' : 'saved'} successfully!`);
        } catch (error) {
            console.error('Error saving patient:', error);
            alert('Error saving patient');
        }
    }

    async editPatient(patientId) {
        const patient = await window.electronAPI.getPatient(patientId);
        this.currentPatientId = patientId;
        this.showPatientModal(patient);
    }

    editCurrentPatient() {
        if (this.currentPatientId) this.editPatient(this.currentPatientId);
    }

    async deletePatient(patientId) {
        const patientData = await window.electronAPI.getPatient(patientId);
        if (confirm(`Delete this patient?\n\nName: ${patientData.name}\nContact: ${patientData.contact}`)) {
            await window.electronAPI.deletePatient(patientId);
            await this.loadPatients();
            if (this.currentPatientId === patientId) this.showPage('patients');
        }
    }

    showTimelineModal() {
        document.getElementById('timeline-modal').style.display = 'block';
    }

    async saveTimeline(e) {
        e.preventDefault();
        const visitData = {
            chiefComplaint: document.getElementById('chiefComplaint').value,
            history: document.getElementById('history').value,
            findings: document.getElementById('findings').value,
            diagnosis: document.getElementById('diagnosis').value,
            plan: document.getElementById('plan').value,
            diagnosisType: document.getElementById('diagnosisType').value
        };

        try {
            await window.electronAPI.addVisit(this.currentPatientId, visitData);
            this.hideModal('timeline-modal');
            await this.viewPatient(this.currentPatientId);
            await this.loadAnalytics();
            alert('Timeline added!');
        } catch (error) {
            console.error('Error saving timeline:', error);
            alert('Error saving timeline');
        }
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    async loadAnalytics() {
        try {
            const analytics = await window.electronAPI.getAnalytics(this.currentFilter);
            await this.renderAnalytics(analytics);
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async renderAnalytics(analytics) {
        document.getElementById('total-patients').textContent = analytics.totalPatients;
        document.getElementById('total-visits').textContent = analytics.totalVisits;
        document.getElementById('ear-count').textContent = analytics.entCounts.ear;
        document.getElementById('nose-count').textContent = analytics.entCounts.nose;
        document.getElementById('throat-count').textContent = analytics.entCounts.throat;

        await this.renderDonutChart(analytics.entCounts);
        await this.renderDailyVisitsChart(analytics.dailyVisits);
    }

    async renderDonutChart(entCounts) {
        await this.ensureChartReady();
        this.normalizeChartGlobal();
        const canvas = document.getElementById('entDonutChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        try {
            if (this.donutChart) this.donutChart.destroy();
            this.donutChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Ear', 'Nose', 'Throat'],
                    datasets: [{
                        data: [entCounts.ear, entCounts.nose, entCounts.throat],
                        backgroundColor: ['#e74c3c', '#3498db', '#27ae60']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } catch (err) {
            console.error('Failed to render donut chart', err);
        }
    }

    async renderDailyVisitsChart(dailyVisits) {
        await this.ensureChartReady();
        this.normalizeChartGlobal();
        const canvas = document.getElementById('dailyVisitsChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        try {
            if (this.dailyChart) this.dailyChart.destroy();
            this.dailyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: dailyVisits.map(d => d.day),
                    datasets: [{
                        label: 'Visits',
                        data: dailyVisits.map(d => d.visits),
                        backgroundColor: '#3498db'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } catch (err) {
            console.error('Failed to render daily visits chart', err);
        }
    }

    ensureChartReady(timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (window.Chart) return resolve();

            const candidates = [
                './vendor/chart.min.js',
                '../../node_modules/chart.js/dist/chart.umd.min.js',
                '../../node_modules/chart.js/dist/chart.umd.js',
                '../../node_modules/chart.js/dist/chart.js'
            ];

            const loadScript = (src, perScriptTimeout = Math.max(1500, timeout)) => {
                return new Promise((res, rej) => {
                    // If a script with same src already present, listen to its events
                    const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.indexOf(src.replace(/^(\.\/|\.\.\/)+/, '')) !== -1);
                    if (existing) {
                        if (window.Chart) return res();
                        existing.addEventListener('load', () => res());
                        existing.addEventListener('error', () => rej(new Error('script load error')));
                        // fallback: if already complete
                        if (existing.readyState && (existing.readyState === 'complete' || existing.readyState === 'loaded')) return res();
                        return;
                    }

                    const s = document.createElement('script');
                    s.type = 'text/javascript';
                    s.async = false;
                    s.src = src;
                    const timer = setTimeout(() => {
                        s.remove();
                        rej(new Error('timeout'));
                    }, perScriptTimeout);
                    s.addEventListener('load', () => {
                        clearTimeout(timer);
                        s.dataset.loaded = 'true';
                        res();
                    });
                    s.addEventListener('error', () => {
                        clearTimeout(timer);
                        s.remove();
                        rej(new Error('error loading ' + src));
                    });
                    document.head.appendChild(s);
                });
            };

            (async () => {
                const start = Date.now();
                for (const src of candidates) {
                    if (window.Chart) return resolve();
                    try {
                        // Try to load candidate script and wait a short time for Chart to be available
                        await loadScript(src, Math.max(1200, Math.floor(timeout / candidates.length)));
                        // give a brief moment for Chart to initialize
                        const waitFor = 300;
                        const t0 = Date.now();
                        while (Date.now() - t0 < waitFor) {
                            if (window.Chart) return resolve();
                            // small sleep
                            await new Promise(r => setTimeout(r, 50));
                        }
                    } catch (e) {
                        // ignore and try next candidate
                    }

                    if (Date.now() - start >= timeout) break;
                }

                // Final polling until overall timeout
                const interval = 50;
                let waited = 0;
                while (waited < timeout) {
                    if (window.Chart) return resolve();
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise(r => setTimeout(r, interval));
                    waited += interval;
                }

                console.warn('Chart.js not available after waiting', timeout);
                return reject(new Error('Chart.js not available'));
            })();
        });
    }

    // Normalize Chart export variants (commonjs / esm / contextBridge proxies)
    normalizeChartGlobal() {
        if (!window.Chart) return false;
        try {
            // If Chart is wrapped as { default: Chart } (ESM interop), assign default
            if (window.Chart.default && typeof window.Chart.default === 'function') {
                window.Chart = window.Chart.default;
            }

            // Some bundlers export { Chart: Chart }
            if (window.Chart.Chart && typeof window.Chart.Chart === 'function') {
                window.Chart = window.Chart.Chart;
            }

            return typeof window.Chart === 'function' || typeof window.Chart === 'object';
        } catch (e) {
            console.warn('normalizeChartGlobal error', e);
            return false;
        }
    }

    async exportData() {
        try {
            const exportPath = await window.electronAPI.exportData();
            alert(`Data exported to: ${exportPath}`);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Error exporting data');
        }
    }

    downloadPDF() {
        window.print();
    }

    calculateAge(birthdate) {
        const today = new Date();
        const birthDate = new Date(birthdate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new ENTApp();
});