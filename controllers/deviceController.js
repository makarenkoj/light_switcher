import { controlDevice, statusDevice } from '../utils/deviceUtils.js';
import Device from '../models/deviceModel.js';
import User from '../models/userModel.js';

async function create(req, res) {
  try {
    console.log(req.body)
    const user = await User.findById(req.user._id);
    const { name, deviceId, accessId, accessSecret } = req.body;
    const device = await Device.create({ name, deviceId, accessId, accessSecret, userId: user._id });

    res.status(201).json({ message: 'Device created successfully', device: {device} });
  } catch (error) {
    console.error('Created Error:', error);
    res.status(500).json({ error: 'Failed to create device!' });
  }
};

async function getStatus(req, res) {
  try {
    const deviceStatus = await statusDevice();
    let status = false;

    deviceStatus.result.forEach(device => {
      if (device.code === 'switch_1') {
        status = device.value;
      }
    });

    res.status(200).json({ message: `Device`, body: status });
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function changeStatus(req, res) {
  try {
    const { status } = req.body;
    const device = await controlDevice(status);
    console.log('Device:', device);

    res.status(200).json({ message: `Device is ${status ? 'ON' : 'OFF'}`, body: device });
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export { changeStatus, getStatus, create };
