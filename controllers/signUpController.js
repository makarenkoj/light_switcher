import path from 'path';
import { fileURLToPath } from 'url';

let currentFilename;
let currentDirname;

if (typeof __filename !== 'undefined' && typeof __dirname !== 'undefined') {
  currentFilename = __filename;
  currentDirname = __dirname;
} else if (typeof import.meta.url !== 'undefined') {
  try {
    currentFilename = fileURLToPath(import.meta.url);
    currentDirname = path.dirname(currentFilename);
  } catch (e) {
    console.warn('Failed to determine paths via import.meta.url:', e);
    currentFilename = process.cwd() + '/unknown-file.js';
    currentDirname = process.cwd();
  }
} else {
  console.warn('Could not determine file paths via Jest or import.meta.url. Using module.filename fallback.');
  if (typeof module !== 'undefined' && typeof module.filename !== 'undefined') {
       currentFilename = module.filename;
       currentDirname = path.dirname(currentFilename);
  } else {
      currentFilename = process.cwd() + '/ultimate-fallback.js';
      currentDirname = process.cwd();
  }
}

function getSignUpPage(req, res) {
  res.sendFile(path.join(currentDirname, '../views/signup.html'));
};

function getLoginPage(req, res) {
  res.sendFile(path.join(currentDirname, '../views/login.html'));
};

export { getSignUpPage, getLoginPage };
