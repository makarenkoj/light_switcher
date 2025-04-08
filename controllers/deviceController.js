import { controlDevice, statusDevice } from '../utils/deviceUtils.js';
import Devices from '../models/devicesModel.js';
import User from '../models/userModel.js';
import DevicesTriggers from '../models/devicesTriggersModel.js';
import Triggers from '../models/triggersModel.js';
import { t } from '../i18n.js';

async function show(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: t('device.errors.device_not_found') });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: t('device.errors.authorize') });
    };

    const devicesTriggers = await DevicesTriggers.find({deviceId: device._id}).sort({ createdAt: -1 });

    res.status(200).json({ message: t('device.success.retrieved'), device, devicesTriggers });
  } catch (error) {
    console.error(t('device.errors.retrieve_failed'), error);
    res.status(422).json({ error: t('device.errors.retrieve_failed') });
  }
};

async function index(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    };

    let { page = 1, limit = 9 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const devices = await Devices.find({userId: user._id}).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalDevices = await Devices.countDocuments({ userId: user._id });

    if (!devices) {
      return res.status(404).json({ error: t('device.errors.device_not_found') });
    };
  
    res.status(200).json({message: t('device.success.retrieved'),
                          currentPage: page,
                          totalPages: Math.ceil(totalDevices / limit),
                          totalDevices,
                          devices
    });
  } catch (error) {
    console.error(t('device.erors.device_not_found'), error);
    res.status(422).json({ error: t('device.erors.device_not_found') });
  }
}

async function create(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    };

    const { name, deviceId, accessId, secretKey } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: t('device.errors.id_required') });
    };

    const existingDevice = await Devices.findOne({ deviceId });
    if (existingDevice) {
      return res.status(409).json({ error: t('device.errors.id_exists') });
    };

    const device = await Devices.create({ name, deviceId, accessId, secretKey, userId: user._id });

    res.status(201).json({ message: t('device.success.device_created'), device: {device} });
  } catch (error) {
    console.error(t('device.errors.device_not_created'), error);
    res.status(422).json({ error: t('device.errors.device_not_created') });
  }
};

async function update(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: t('device.errors.device_not_found') });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: t('device.errors.authorize') });
    };

    const { name, deviceId, accessId, secretKey } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (deviceId) updateFields.deviceId = deviceId;
    if (accessId) updateFields.accessId = accessId;
    if (secretKey) updateFields.secretKey = secretKey;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: t('device.errors.nothing_to_update') });
    }

    const updatedDevice = await Devices.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedDevice) {
      return res.status(404).json({ error: t('device.errors.device_not_found') });
    }
    res.status(200).json({ message: t('device.success.device_updated'), updatedDevice });
  } catch (error) {
    console.error(t('device.errors.device_not_updated'), error);
    res.status(422).json({ error: t('device.errors.device_not_updated') });
  }
};

async function remove(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: t('device.errors.device_not_found') });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: t('device.errors.authorize') });
    };

    await device.deleteOne();
    res.status(200).json({ message: t('device.success.device_deleted') });
  } catch (error) {
    console.error(t('device.errors.device_not_deleted'), error);
    res.status(422).json({ error: t('device.errors.device_not_deleted') });
  }
};

async function getStatus(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: t('device.errors.device_not_found') });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: t('device.errors.authorize') });
    };

    const deviceStatus = await statusDevice(device.deviceId, device.accessId, device.secretKey);
    let status = false;

    deviceStatus.result.forEach(device => {
      if (device.code === 'switch_1') {
        status = device.value;
      }
    });

    await device.updateOne({ status });

    res.status(200).json({ message: t('device.success.retrieved'), status: status });
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
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    };

    const device = await Devices.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: t('device.errors.device_not_found') });
    };

    if (device.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: t('device.errors.authorize') });
    };

    const { status } = req.body;
    const deviceData = await controlDevice(device._id, status, device.deviceId, device.accessId, device.secretKey);

    await device.updateOne({ status });

    res.status(200).json({ message: t('device.success.device_is', {status: status ? t('device.success.on') : t('device.success.off')}), body: deviceData });
  }
  catch (error) {
    res.status(422).json({ error: error.message });
  }
}

async function triggers(req, res) {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: t('user.errors.user_not_found') });
        }

        let { page = 1, limit = 9 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;
        
        const device = await Devices.findById(req.params.id);
        if (!device) {
          return res.status(404).json({ error: t('device.errors.device_not_found') });
        }

        const devicesTriggers = await DevicesTriggers.find({deviceId: device._id }).sort({ createdAt: -1 });
        if (!devicesTriggers) {
          return res.status(404).json({ error: t('device.errors.dt_not_found') });
        };

        const triggers = await Triggers.find({ userId: user._id, _id: { $in: devicesTriggers.map(dt => dt.triggerId) } }).sort({ createdAt: -1 }).skip(skip).limit(limit);
        if (!triggers) {
          return res.status(404).json({ error: t('trigger.errors.trigger_not_found') });
        };

        const totalTriggers = await Triggers.countDocuments({ userId: user._id, _id: { $in: devicesTriggers.map(dt => dt.triggerId) } });

        res.status(200).json({message: t('trigger.success.retrieved'),
            currentPage: page,
            totalPages: Math.ceil(totalTriggers / limit),
            totalTriggers,
            triggers
        });
    } catch (error) {
        console.error(t('trigger.errors.triggers', {error: error}));
        res.status(422).json({ error: error.message });
    }
}

export { changeStatus, getStatus, show, index, update, create, remove, triggers};
