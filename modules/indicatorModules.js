import Indicators from '../models/indicatorsModel.js';
import Triggers from '../models/triggersModel.js';
import { t } from '../i18n.js';
import { io } from '../app.js';

async function changeIndicatorStatus(triggerId) {
  try {
    const trigger = await Triggers.findById(triggerId);
    if (!trigger) {
      throw new Error(t('trigger.errors.trigger_not_found'));
    }

    const indicators = await Indicators.find({ trigger: triggerId }).populate('user', '-password').populate('trigger').sort({ createdAt: -1 });
    if (indicators.length > 0) {
      for (const indicator of indicators) {
        indicator.status = trigger.status;
        await indicator.save();
        io.emit('indicatorNotification', { message: t('indicator.success.updated'), indicator });
      }
    };
  } catch (error) {
    console.error(t('indicator.errors.retrieve', {error: error}));
  }
};

export { changeIndicatorStatus };
