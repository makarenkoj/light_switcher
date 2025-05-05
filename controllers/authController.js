import User from '../models/userModel.js';
import { initializeClient } from './telegramController.js';
import { t } from '../i18n.js';
import { generateToken } from '../utils/tokenUtils.js';
import { io } from '../app.js';

async function register(req, res) {
  try {
    const { email, password, phoneNumber } = req.body;
    const user = await User.create({ email, password, phoneNumber, role: 'user' });
    const token = generateToken(user);

    res.status(201).json({ message: t('user.success.create'), token, userId: user._id });
    io.emit('userNotification', { message: t('user.success.new', {user: user}) });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern.email && error.keyPattern.phoneNumber) {
        console.error(t('user.errors.email_phone_taken'));
        return res.status(409).json({ error: t('user.errors.email_phone_taken') });
      }
      if (error.keyPattern.email) {
        console.error(t('user.errors.email_taken'));
        return res.status(409).json({ error: t('user.errors.email_taken') });
      }
      if (error.keyPattern.phoneNumber) {
        console.error(t('user.errors.phone_taken'));
        return res.status(409).json({ error: t('user.errors.phone_taken') });
      }
      console.error(t('user.errors.duplicate_key', { error: error.message }));
      return res.status(409).json({ error: t('user.errors.duplicate_key') });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      console.error(t('user.errors.validation', {error: errors.join(', ')}));
      return res.status(422).json({ error: t('user.errors.validation', { validationErrors: errors.join(', ') }) }); // Передаємо деталі валідації окремо в t
    }

    console.error(t('user.errors.registration', {error: error}) );
    res.status(422).json({ error: t('user.errors.registration', {error: error.message}) });
  }
};

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    let restoredSesion = false;

    if (!user || !(await user.comparePassword(password))) {
      console.error(t('user.errors.password_email'))
      return res.status(401).json({ error: t('user.errors.password_email') });
    };

    const admin = await User.findOne({ role: 'admin' });

    if (admin) {
      restoredSesion = await initializeClient(admin._id);
    } else {
      console.error(t('user.errors.admin_not_found'));
    };

    const token = generateToken(user);

    res.status(200).json({ message: t('user.success.login'), token, restoredSesion: restoredSesion, userId: user._id });
    io.emit('userNotification', { message: t('user.success.login_new', {user: user}) });
  } catch (error) {
    console.error(t('user.errors.login_failed', {error: error}));
    res.status(422).json({ error: t('user.errors.login_failed', {error: error}) });
  }
};

async function logout(req, res) {
  try {
    await io.emit('userNotification', { message: t('user.success.logout') });
    res.status(200).json({ message: t('user.success.logout') });
  } catch (error) {
    console.error(t('user.errors.logout', {error: error}));
    res.status(422).json({ error: t('user.errors.logout', {error: error})});
  }
};

export { register, login, logout };
