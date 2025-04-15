import User from '../models/userModel.js';
import Devices from '../models/devicesModel.js';
import Session from '../models/sessionModel.js';
import { t } from '../i18n.js';
import { io } from '../app.js';

async function show(req, res) {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    };

    const devices = await Devices.find({userId: user._id});
    const session = await Session.find({ userId: user._id });
    let telegramSession = false;

    if (session.length > 0) {
      telegramSession = true;
    };

    res.status(200).json({ message: t('user.success.retrieved'), user, devicesCount: devices.length, telegramSession: telegramSession });
  } catch (error) {
    console.error(t('user.errors.retrieve_failed', {error: error}));
    res.status(422).json({ error: t('user.errors.retrieve_failed', {error: error}) });
  }
};

async function update(req, res) {
  try {
    const { email, password, phoneNumber } = req.body;
    const updateFields = {};
    if (email) updateFields.email = email;
    if (password) updateFields.password = password;
    if (phoneNumber) updateFields.phoneNumber = phoneNumber;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: t('user.errors.nothing_to_update') });
    };

    if (await User.findOne({ email })) {  
      return res.status(400).json({ error: t('user.errors.email_exists') });
    };

    const user = await User.findByIdAndUpdate(req.user._id, updateFields, { new: true }).select('-password');

    res.status(200).json({ message: t('user.seccess.user_updated'), user });
  } catch (error) {
    console.error(t('user.errors.update', {error: error}));
    res.status(422).json({ error: t('user.errors.user_not_updated') });
  }
};

async function remove(req, res) {
  try {
    const user = await User.findById(req.user._id);
    await user.deleteOne();

    res.status(200).json({ message: t('user.success.deleted') });
    io.emit('userNotification', { message: t('user.success.remove', {user: user}) });
  } catch (error) {
    console.error(t('user.errors.delete', {error: error}));
    res.status(422).json({ error: t('user.errors.user_not_deleted') });
  }
};

export { show, update, remove };
