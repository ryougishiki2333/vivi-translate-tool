const fs = require('fs');
const path = require('path');

const venvPath = path.join(__dirname, '../python/venv/Scripts/python.exe');

if (!fs.existsSync(venvPath)) {
  console.error('[ERROR] Python virtual environment not found!');
  console.error('[PATH] Expected path:', venvPath);
  console.error('');
  console.error('Please run the following commands to create virtual environment:');
  console.error('  cd python');
  console.error('  python -m venv venv');
  console.error('  .\\venv\\Scripts\\activate');
  console.error('  pip install -r requirements.txt');
  console.error('');
  process.exit(1);
} else {
  console.log('[OK] Python virtual environment found');
  console.log('[PATH]', venvPath);
}
