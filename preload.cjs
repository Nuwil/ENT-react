const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getPatients: () => ipcRenderer.invoke('database:getPatients'),
    getPatient: (id) => ipcRenderer.invoke('database:getPatient', id),
    addPatient: (patientData) => ipcRenderer.invoke('database:addPatient', patientData),
    updatePatient: (id, patientData) => ipcRenderer.invoke('database:updatePatient', id, patientData),
    deletePatient: (id) => ipcRenderer.invoke('database:deletePatient', id),
    addVisit: (patientId, visitData) => ipcRenderer.invoke('database:addVisit', patientId, visitData),
    getAnalytics: (filter) => ipcRenderer.invoke('database:getAnalytics', filter),
    exportData: () => ipcRenderer.invoke('database:exportData'),
    onMenuNewPatient: (callback) => ipcRenderer.on('menu-new-patient', callback),
    onMenuExportData: (callback) => ipcRenderer.on('menu-export-data', callback),
    onMenuShowPatients: (callback) => ipcRenderer.on('menu-show-patients', callback),
    onMenuShowAnalytics: (callback) => ipcRenderer.on('menu-show-analytics', callback)
});

// Expose Chart.js to the renderer via contextBridge so charts work offline
// Try several require paths to handle packaging/exports differences.
(() => {
    const candidates = [
        'chart.js/auto',
        'chart.js',
        'chart.js/dist/chart.min.js'
    ];

    for (const name of candidates) {
        try {
            // eslint-disable-next-line node/no-missing-require
            const mod = require(name);
            // Normalize possible shapes (default, Chart, etc.)
            let ChartExport = mod;
            if (mod && mod.default) ChartExport = mod.default;
            if (ChartExport && ChartExport.Chart) ChartExport = ChartExport.Chart;

            if (ChartExport) {
                try {
                    contextBridge.exposeInMainWorld('Chart', ChartExport);
                } catch (e) {
                    // Worst case: cannot expose, ignore and let renderer load script tag
                }
                return;
            }
        } catch (err) {
            // try next candidate
        }
    }

    // Nothing worked — log minimal warning
    console.warn('preload: could not require Chart.js from node_modules; renderer will use script tag if available.');
})();