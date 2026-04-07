const electron = require('electron');
const path = require('path');
const url = require('url');
const { app, BrowserWindow, protocol } = electron;

// Defensive check for app object
if (!app) {
  console.error('Electron app module could not be initialized.');
  process.exit(1);
}

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'الميزان السيادي | Alghwairy Ledger',
    icon: path.join(__dirname, isDev ? 'public/favicon.svg' : 'assets/icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#001a33',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // Optional: uncomment if needed
  } else {
    // Definitive path resolution for packaged apps
    const indexPath = path.join(__dirname, 'dist/index.html');
    win.loadFile(indexPath);
    
    // Auto-hide devtools in production unless explicitly wanted
    // win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  try {
    // Handle some scheme issues in newer Electron
    if (protocol && typeof protocol.registerFileProtocol === 'function') {
      protocol.registerFileProtocol('app', (request, callback) => {
        const url = request.url.substr(6);
        callback({ path: path.normalize(`${__dirname}/${url}`) });
      });
    }
  } catch (error) {
    console.warn('Failed to register protocol:', error);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
