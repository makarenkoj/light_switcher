// import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { initializeClient } from './telegramController.js';
// const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
import { t } from '../i18n.js';
import { generateToken } from '../utils/tokenUtils.js';

async function register(req, res) {
  try {
    const { email, password, phoneNumber } = req.body;
    const user = await User.create({ email, password, phoneNumber });
    const token = generateToken(user); //jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: t('user.success.create'), token, userId: user._id });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        console.error(t('user.errors.email_taken'));
        return res.status(409).json({ error: t('user.errors.email_taken') });
      }
      if (error.keyPattern.phoneNumber) {
        console.error(t('user.errors.phone_taken'));
        return res.status(409).json({ error: t('user.errors.phone_taken') });
      }
      console.error(t('user.errors.email_phone_taken'));
      return res.status(409).json({ error: t('user.errors.email_phone_taken') });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      console.error(t('user.errors.validation', {error: errors.join(', ')}));
      return res.status(422).json({ error: t('user.errors.validation', {error: errors.join(', ')}) });
    }

    console.error(t('user.errors.registration', {error: error}) );
    res.status(422).json({ error: t('user.errors.registration', {error: error.message}) });
  }
};

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      console.error(t('user.errors.password_email'))
      return res.status(401).json({ error: t('user.errors.password_email') });
    };

    const restoredSesion = await initializeClient(user._id);
    const token = generateToken(user); //jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ message: t('user.success.login'), token, restoredSesion: restoredSesion, userId: user._id });
  } catch (error) {
    console.error(t('user.errors.login_failed', {error: error}));
    res.status(422).json({ error: t('user.errors.login_failed', {error: error}) });
  }
};

async function logout(req, res) {
  try {
    res.status(200).json({ message: t('user.success.logout') });
  } catch (error) {
    console.error(t('user.errors.logout', {error: error}));
    res.status(422).json({ error: t('user.errors.logout', {error: error})});
  }
};

export { register, login, logout };
