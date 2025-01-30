import User from '../models/userModel.js';
import Devices from '../models/devicesModel.js';
import Session from '../models/sessionModel.js';

async function show(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    };

    const devices = await Devices.find({userId: user._id});
    const session = await Session.find({ userId: user._id });
    let telegramSession = false;

    if (session.length > 0) {
      telegramSession = true;
    };

    res.status(200).json({ message: 'User retrieved successfully', user, devicesCount: devices.length, telegramSession: telegramSession });
  } catch (error) {
    console.error('Retrieved Error:', error);
    res.status(500).json({ error: 'User retrieved failed' });
  }
};

async function update(req, res) {
  try {
    const { email, password, phoneNumber } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { email, password, phoneNumber }, { new: true });

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ error: 'User update failed' });
  }
};

async function remove(req, res) {
  try {
    const { email, password, phoneNumber } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { email, password, phoneNumber }, { new: true });

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ error: 'User update failed' });
  }
};

export { show, update, remove };
