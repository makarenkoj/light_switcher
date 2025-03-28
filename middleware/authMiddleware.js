import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import i18n, { t } from '../i18n.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const detectLanguage = (req) => {
  const language = req.headers['accept-language']?.split(',')[0];
  if (language) {
    req.language = language;
    i18n.changeLanguage(language);
  };
};

const authenticateUser = async (req, res, next) => {
  detectLanguage(req);

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token not provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

export default authenticateUser;
