const electron = require('electron');
console.log('Electron object type:', typeof electron);
console.log('Electron keys:', Object.keys(electron));
console.log('App object type:', typeof electron.app);
const { app } = electron;
console.log('Destructured app type:', typeof app);
