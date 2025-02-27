import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSignUpPage(req, res) {
  res.sendFile(path.join(__dirname, '../views/signup.html'));
};

function getLoginPage(req, res) {
  res.sendFile(path.join(__dirname, '../views/login.html'));
};

export { getSignUpPage, getLoginPage };
