import Triggers from '../models/triggersModel.js';
import User from '../models/userModel.js';
import Devices from '../models/devicesModel.js';
import DevicesTriggers from '../models/devicesTriggersModel.js';
import { getClient, joinChannel } from './telegramController.js'
import { t } from '../i18n.js';

export async function show(req, res) {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: t('user.errors.user_not_found') });
        }

        const trigger = await Triggers.findById(req.params.id);
        if (!trigger) {
            return res.status(404).json({ error: t('trigger.errors.trigger_not_found') });
        }

        if (trigger.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ error: t('errors.authorized') });
        }

        res.json(trigger);
    } catch (error) {
        res.status(422).json({ error: error.message });
    }
}

export async function index(req, res) {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: t('user.errors.user_not_found') });
        }

        let { page = 1, limit = 9 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const triggers = await Triggers.find({ userId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalTriggers = await Triggers.countDocuments({ userId: user._id });

        if (!triggers) {
            return res.status(404).json({ error: t('trigger.errors.trigger_not_found') });
        };

        res.status(200).json({message: t('trigger.success.retrieved'),
            currentPage: page,
            totalPages: Math.ceil(totalTriggers / limit),
            totalTriggers,
            triggers
        });
    } catch (error) {
        console.error(t('trigger.errors.triggers', {error: error}));
        res.status(422).json({ error: t('trigger.errors.triggers', {error: error.message}) });
    }
}

export async function create(req, res) {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: t('user.errors.user_not_found') });
        }

        const chanelId = await getChanelId(req.body.chanelName);
        if (!chanelId) {
            return res.status(404).json({ error: t('errors.channel_not_found') });
        };

        const trigger = new Triggers({ ...req.body, chanelId: chanelId, userId: user._id });
        await trigger.save();
        res.status(201).json(trigger);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function update(req, res) {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: t('user.errors.user_not_found') });
        }

        const trigger = await Triggers.findById(req.params.id);
        if (!trigger) {
            return res.status(404).json({ error: t('trigger.errors.trigger_not_found') });
        }

        if (trigger.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ error: t('errors.authorized') });
        }

        Object.assign(trigger, req.body);
        await trigger.save();
        res.json(trigger);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function remove(req, res) {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: 'User not found!' });
        }

        const trigger = await Triggers.findById(req.params.id);
        if (!trigger) {
            return res.status(404).json({ error: 'Trigger not found!' });
        }

        if (trigger.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ error: 'You are not authorized to delete this trigger!' });
        }

        await trigger.deleteOne();
        res.json({ message: 'Trigger deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getFilteredTriggers(req, res) {
    console.log('Get filtered triggers:', req.query, req.params);

    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: t('user.errors.user_not_found') });
        }

        const device = await Devices.findById(req.query.deviceId);

        if (!device) {
        return res.status(404).json({ error: t('device.errors.device_not_found') });
        };

        const linkedTriggers = await DevicesTriggers.find({ deviceId: device._id }).distinct('triggerId');

        let { page = 1, limit = 9 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const triggers = await Triggers.find({ _id: { $nin: linkedTriggers }, userId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit);

        res.status(200).json({ message: t('trigger..success.fetched'), triggers });
    } catch (error) {
        console.error(t('trigger.errorsfetching', {error: error}));
        res.status(422).json({ error: t('trigger.errorsfetching', {error: error}) });
    }
}

async function getChanelId(chanelName) {
    try {
        const client = await getClient();
        if (!client) {
            return null;
        }

        const chat = await client.getEntity(chanelName);
        if (chat) {
            await joinChannel(chat.username);
            return chat.id.value;
        } else {
            return null;
        }
    } catch (error) {
        console.error(t('errors.chanel_id', {error: error}));
    }
};
