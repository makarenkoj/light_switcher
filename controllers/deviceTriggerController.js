import DevicesTriggers from '../models/devicesTriggersModel.js';
import Triggers from '../models/triggersModel.js';
import Devices from '../models/devicesModel.js';
import User from '../models/userModel.js';
import { t } from '../i18n.js';

export async function createDeviceTrigger(req, res) {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: t('user.errors.user_not_found') });
        }

        const device = await Devices.findById(req.params.id);
        if (!device) {
            return res.status(404).json({ error: t('device.errors.not_found') });
        }

        const trigger = await Triggers.findById(req.body.triggerId);
        if (!trigger) {
            return res.status(404).json({ error: t('trigger.errors.trigger_not_found') });
        }
        
        const devicesTriggers = await DevicesTriggers.find({deviceId: device._id, triggerId: trigger._id}).sort({ createdAt: -1 });
        if (devicesTriggers.length > 0) {
            return res.status(409).json({ error: t('device.errors.alredy_exists_dt') });
        }

        const deviceTrigger = new DevicesTriggers({ deviceId: device._id, triggerId: trigger._id });
        await deviceTrigger.save();
        res.status(201).json(deviceTrigger);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function deleteDeviceTrigger(req, res) {
    console.log('Delete deviceTrigger:', req.params, req.body);

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: t('user.errors.user_not_found') });
        }

        const device = await Devices.findById(req.params.id);
        if (!device) {
            return res.status(404).json({ error: t('device.errors.not_found') });
        }

        const trigger = await Triggers.findById(req.body.triggerId);
        if (!trigger) {
            return res.status(404).json({ error: t('trigger.errors.trigger_not_found') });
        }

        const deviceTrigger = await DevicesTriggers.findOne({ deviceId: device._id, triggerId: trigger._id });
        if (!deviceTrigger) {
            return res.status(404).json({ error: t('device.errors.dt_not_found') });
        }

        await deviceTrigger.deleteOne();
        res.status(200).json(deviceTrigger);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}
