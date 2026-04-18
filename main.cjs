const electron = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const os = require('os');
const { app, BrowserWindow, protocol, ipcMain, shell, dialog } = electron;

// Register privileged schemes for secure context in Electron
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

// Defensive check for app object
if (!app) {
  console.error('Electron app module could not be initialized.');
  process.exit(1);
}

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    title: 'مؤسسة الغويري للتخليص الجمركي - المنظومة السيادية',
    icon: path.join(__dirname, isDev ? 'public/favicon.svg' : 'assets/icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#001a33',
    show: false, // Show when ready to prevent flicker
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: false,
      // Enable biometric support in some Electron versions
      enableWebSQL: false,
      spellcheck: false
    },
  });

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    // IMPORTANT: Use the custom 'app://' protocol instead of file://
    // file:// is NOT a secure context, so WebAuthn/biometrics will fail.
    // The 'app' scheme was registered as privileged+secure at the top of this file.
    win.loadURL('app://./dist/index.html');
  }

  // === IPC: Print to PDF ===
  ipcMain.handle('print-to-pdf', async () => {
    try {
      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      
      const docsDir = path.join(os.homedir(), 'Documents', 'Alghwairy_Invoices');
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      
      const fileName = `Invoice_${Date.now()}.pdf`;
      const filePath = path.join(docsDir, fileName);
      
      // Show save dialog with default path
      const { canceled, filePath: chosenPath } = await dialog.showSaveDialog(win, {
        defaultPath: filePath,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        title: 'حفظ الفاتورة كـ PDF'
      });
      
      if (!canceled && chosenPath) {
        fs.writeFileSync(chosenPath, pdfData);
        shell.showItemInFolder(chosenPath);
        return { success: true, path: chosenPath };
      }
      return { success: false, canceled: true };
    } catch (err) {
      console.error('PDF Error:', err);
      return { success: false, error: err.message };
    }
  });

  // === IPC: Open External URL (WhatsApp, Email, etc.) ===
  ipcMain.handle('open-external', async (_event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      console.error('Open External Error:', err);
      return { success: false, error: err.message };
    }
  });
}

app.whenReady().then(() => {
  // Register custom app protocol
  protocol.handle('app', (request) => {
    const filePath = request.url.slice('app://'.length);
    const resolvedPath = path.join(__dirname, filePath.split('?')[0]);
    return electron.net.fetch(url.pathToFileURL(resolvedPath).toString());
  });

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

