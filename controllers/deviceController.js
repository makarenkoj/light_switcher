import { controlDevice, statusDevice } from '../utils/deviceUtils.js';
import Devices from '../models/devicesModel.js';
import User from '../models/userModel.js';

async function show(req, res) {
  console.log('Show Device:', req.body);

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found!' });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to view this device!' });
    };
  
    res.status(200).json({ message: 'Device retrieved successfully', device });
  } catch (error) {
    console.error('Show Device Error:', error);
    res.status(422).json({ error: 'Failed to retrieve device!' });
  }
};

async function index(req, res) {
  console.log('Index Device:', req.body);

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    };

    let { page = 1, limit = 9 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const devices = await Devices.find({userId: user._id}).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalDevices = await Devices.countDocuments({ userId: user._id });

    if (!devices) {
      return res.status(404).json({ error: 'Device not found!' });
    };
  
    res.status(200).json({message: 'Device retrieved successfully',
                          currentPage: page,
                          totalPages: Math.ceil(totalDevices / limit),
                          totalDevices,
                          devices
    });
  } catch (error) {
    console.error('Devices Error:', error);
    res.status(422).json({ error: 'Failed to find devices!' });
  }
}

async function create(req, res) {
  console.log('Create Device:', req.body);
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    };

    const { name, deviceId, accessId, secretKey } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required!' });
    };

    const existingDevice = await Devices.findOne({ deviceId });
    if (existingDevice) {
      return res.status(409).json({ error: 'Device with this ID already exists!' });
    };

    const device = await Devices.create({ name, deviceId, accessId, secretKey, userId: user._id });

    res.status(201).json({ message: 'Device created successfully', device: {device} });
  } catch (error) {
    console.error('Created Error:', error);
    res.status(422).json({ error: 'Failed to create device!' });
  }
};

async function update(req, res) {
  console.log('Update Device:', req.body);

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found!' });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to delete this device!' });
    };

    const { name, deviceId, accessId, secretKey } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (deviceId) updateFields.deviceId = deviceId;
    if (accessId) updateFields.accessId = accessId;
    if (secretKey) updateFields.secretKey = secretKey;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'Nothing to update!' });
    }

    const updatedDevice = await Devices.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedDevice) {
      return res.status(404).json({ error: 'Device not found!' });
    }
    res.status(200).json({ message: 'Device updated successfully', updatedDevice });
  } catch (error) {
    console.error('Created Error:', error);
    res.status(422).json({ error: 'Failed to update device!' });
  }
};

async function remove(req, res) {
  console.log('Update Device:', req.body);

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found!' });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to delete this device!' });
    };

    await device.deleteOne();
    res.status(200).json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Remove Error:', error);
    res.status(422).json({ error: 'Failed to delete device!' });
  }
};

async function getStatus(req, res) {
  console.log('Get status Device:', req.body);

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found!' });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to delete this device!' });
    };

    const deviceStatus = await statusDevice(device.deviceId, device.accessId, device.secretKey);
    let status = false;

    deviceStatus.result.forEach(device => {
      if (device.code === 'switch_1') {
        status = device.value;
      }
    });

    await device.updateOne({ status });

    res.status(200).json({ message: `Device status retrieved  successfull`, status: status });
  }
  catch (error) {
    res.status(422).json({ error: error.message });
  }
}

async function changeStatus(req, res) {
  console.log('Change status Device:', req.body);

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found!' });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to delete this device!' });
    };

    const { status } = req.body;
    const deviceData = await controlDevice(status, device.deviceId, device.accessId, device.secretKey);
    console.log('Device:', deviceData );

    await device.updateOne({ status });

    res.status(200).json({ message: `Device is ${status ? 'ON' : 'OFF'}`, body: deviceData });
  }
  catch (error) {
    res.status(422).json({ error: error.message });
  }
}

export { changeStatus, getStatus, show, index, update, create, remove };
