import Triggers from '../models/triggersModel.js';
import User from '../models/userModel.js';
import Devices from '../models/devicesModel.js';
import DevicesTriggers from '../models/devicesTriggersModel.js';
import mongoose from 'mongoose';

const getUserTriggers = async (user) => {
  const userDevicesTriggers = [];
  try {
    const devices = await Devices.find({userId: user._id}).sort({ createdAt: -1 });

    for (const device of devices) {
      const devicesTriggers = await DevicesTriggers.find({deviceId: device._id}).sort({ createdAt: -1 });
      const triggers = await Triggers.find({_id: devicesTriggers.map(dt => dt.triggerId), status: true }).sort({ createdAt: -1 });
      userDevicesTriggers.push({device, triggers});
    }

    return userDevicesTriggers;
  
  } catch (error) {
    console.error('Error fetching user triggers:', error);
    throw new Error('Failed to fetch triggers');
  }
}

export { getUserTriggers };
