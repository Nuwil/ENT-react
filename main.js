const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const Database = require('./src/main/database.cjs');

const db = new Database();
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            webSecurity: false
        },
        title: 'ENT Recording System'
    });

    // Load from Vite dev server or build output
    if (process.argv.includes('--dev')) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist-renderer', 'index.html'));
    }

    createApplicationMenu();
}

function createApplicationMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Patient',
                    accelerator: 'Ctrl+N',
                    click: () => mainWindow.webContents.send('menu-new-patient')
                },
                { type: 'separator' },
                {
                    label: 'Export Data',
                    click: () => mainWindow.webContents.send('menu-export-data')
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Patients',
            submenu: [
                {
                    label: 'Patient List',
                    accelerator: 'Ctrl+1',
                    click: () => mainWindow.webContents.send('menu-show-patients')
                },
                {
                    label: 'Analytics',
                    accelerator: 'Ctrl+2',
                    click: () => mainWindow.webContents.send('menu-show-analytics')
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC Handlers

ipcMain.handle('database:getPatients', async () => db.getPatients());
ipcMain.handle('database:getPatient', async (event, id) => db.getPatient(id));
ipcMain.handle('database:addPatient', async (event, patientData) => db.addPatient(patientData));
ipcMain.handle('database:updatePatient', async (event, id, patientData) => db.updatePatient(id, patientData));
ipcMain.handle('database:deletePatient', async (event, id) => db.deletePatient(id));
ipcMain.handle('database:addVisit', async (event, patientId, visitData) => db.addVisit(patientId, visitData));
ipcMain.handle('database:exportData', async () => db.exportData());
ipcMain.handle('database:getAnalytics', async (event, filter = null) => {
    if (filter && filter.startDate && filter.endDate) {
        // IPC serializes Date objects to strings — parse them back to Date here
        const startDate = new Date(filter.startDate);
        const endDate = new Date(filter.endDate);
        return db.getAnalyticsWithFilter(startDate, endDate);
    }
    return db.getAnalytics();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});