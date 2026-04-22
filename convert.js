const fs = require('fs');
const path = require('path');
const file = 'c:\\Users\\pc\\Downloads\\alghwairy_fin\\tmp_app.tsx';
const output = 'c:\\Users\\pc\\Downloads\\alghwairy_fin\\tmp_app_utf8.tsx';
try {
  const content = fs.readFileSync(file, 'utf16le');
  fs.writeFileSync(output, content, 'utf8');
  console.log('Success');
} catch (e) {
  console.error(e);
}
