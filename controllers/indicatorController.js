import Indicators from '../models/indicatorsModel.js';
import User from '../models/userModel.js';
import Triggers from '../models/triggersModel.js';
import { t } from '../i18n.js';
import { io } from '../app.js';

async function index(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    }

    const indicators = await Indicators.find({ user: user._id }).populate('user', '-password').populate('trigger').sort({ createdAt: -1 });
    console.log(indicators.length);
    if (indicators.length === 0) {
      return res.status(404).json({ error: t('indicator.success.not_found') });
    }

    res.status(200).json({ message: t('indicator.success.retrieved'), indicators });
  } catch (error) {
    console.error(t('indicator.errors.retrieve', {error: error}));
    res.status(422).json({ error: t('indicator.errors.retrieve', {error: error}) });
  }
};

async function show(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    }

    const type = req.body.type;
    const indicator = await Indicators.findOne({ user: user._id, type: type });
    if (!indicator) {
      return res.status(404).json({ error: t('indicator.errors.indicator_not_found') });
    }

    res.status(200).json({ message: t('indicator.success.retrieved'), indicator });
  } catch (error) {
    console.error(t('indicator.errors.retrieve', {error: error}));
    res.status(422).json({ error: t('indicator.errors.retrieve', {error: error}) });
  }
};

async function create(req, res) {
  try {
    console.log(req.body);
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: t('user.errors.user_not_found') });
    }

    const trigger = await Triggers.findById(req.body.triggerId);
    if (!trigger) {
      return res.status(404).json({ error: t('trigger.errors.trigger_not_found') });
    }

    const indicator = new Indicators({ ...req.body, status: trigger.status, user: user, trigger: trigger });
    await indicator.save();
    res.status(201).json({ message: t('indicator.success.created'), indicator });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: t('indicator.errors.exists') });
    }
    console.error(t('indicator.errors.create', {error: error}));
    res.status(422).json({ error: t('indicator.errors.create', {error: error}) });
  }
};

async function update(req, res) {
  try {
    console.log(req.body);
    const { status, triggerId } = req.body;
    const updateFields = {};
    if (typeof status === 'boolean') updateFields.status = status;

    if (triggerId) {
      const trigger = await Triggers.findById(triggerId);
      if (!trigger) {
        return res.status(404).json({ error: t('trigger.errors.trigger_not_found') });
      };
      updateFields.trigger = trigger;
    };

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: t('indicator.errors.nothing_to_update') });
    };

    const indicator = await Indicators.findById(req.params.id);
    if (!indicator) {
      return res.status(404).json({ error: t('indicator.errors.not_found') });
    };

    const updated = await Indicators.findByIdAndUpdate(indicator._id, updateFields, { new: true }).populate('user', '-password').populate('trigger');
    res.status(200).json({ message: t('indicator.success.updated'), indicator: updated });
  } catch (error) {
    console.error(t('indicator.errors.update', {error: error.message}));
    res.status(422).json({ error: t('indicator.errors.update', {error: error.message}) });
  }
};

async function remove(req, res) {
  try {
    const indicator = await Indicators.findById(req.params.id);
    if (!indicator) {
      return res.status(404).json({ error: t('indicator.errors.not_found') });
    };

    await indicator.deleteOne();

    res.status(200).json({ message: t('indicator.success.deleted') });
    io.emit('indicatorNotification', { message: t('indicator.success.deleted'), indicator: indicator });
  } catch (error) {
    console.error(t('indicator.errors.delete', {error: error}));
    res.status(422).json({ error: t('indicator.errors.delete') });
  }
};

export { index, show, create, update, remove };
