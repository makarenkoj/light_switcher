import Triggers from '../models/triggersModel.js';
import User from '../models/userModel.js';
import Devices from '../models/devicesModel.js';
import DevicesTriggers from '../models/devicesTriggersModel.js';
import { getClient } from './telegramController.js'

export async function show(req, res) {
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
            return res.status(403).json({ error: 'You are not authorized to view this trigger!' });
        }

        res.json(trigger);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function index(req, res) {
    console.log('Index triggers:', req.body);

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found!' });
        }

        let { page = 1, limit = 9 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const triggers = await Triggers.find({ userId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalTriggers = await Triggers.countDocuments({ userId: user._id });

        if (!triggers) {
            return res.status(404).json({ error: 'Triggers not found!' });
        };

        res.status(200).json({message: 'Triggers retrieved successfully',
            currentPage: page,
            totalPages: Math.ceil(totalTriggers / limit),
            totalTriggers,
            triggers
        });
    } catch (error) {
        console.error('Triggers Error:', error);
        res.status(422).json({ error: error.message });
    }
}

export async function create(req, res) {
    console.log('Create trigger:', req.body);

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found!' });
        }

        const chanelId = await getChanelId(req.body.chanelName);
        if (!chanelId) {
            return res.status(404).json({ error: "Chanel not found or You doesnt connect to Telegram!" });
        };

        const trigger = new Triggers({ ...req.body, chanelId: chanelId, userId: user._id });
        console.log('Trigger:', trigger);
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
            return res.status(404).json({ error: 'User not found!' });
        }

        const trigger = await Triggers.findById(req.params.id);
        if (!trigger) {
            return res.status(404).json({ error: 'Trigger not found!' });
        }

        if (trigger.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ error: 'You are not authorized to update this trigger!' });
        }

        Object.assign(trigger, req.body);
        await trigger.save();
        res.json(trigger);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function remove(req, res) {
    console.log('Remove trigger:', req.params);

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
            return res.status(404).json({ error: 'User not found!' });
        }

        const device = await Devices.findById(req.query.deviceId);

        if (!device) {
        return res.status(404).json({ error: 'Device not found!' });
        };

        const linkedTriggers = await DevicesTriggers.find({ deviceId: device._id }).distinct('triggerId');

        let { page = 1, limit = 9 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const triggers = await Triggers.find({ _id: { $nin: linkedTriggers }, userId: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit);

        res.status(200).json({ message: 'Triggers fetched successfully', triggers });
    } catch (error) {
        console.error('Error fetching triggers:', error);
        res.status(500).json({ error: 'Failed to fetch triggers' });
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
            return chat.id.value;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting chanel id:', error);
    }
};
