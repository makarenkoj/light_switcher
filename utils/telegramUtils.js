import {controlDevice} from './deviceUtils.js';
import Triggers from '../models/triggersModel.js';

async function sendAndHandleMessages(client, channelName, userMessage, channelMessage, user) {
  try {
    await client.sendMessage("me", { message: userMessage });
    await client.sendMessage(channelName, { message: channelMessage });

    client.addEventHandler(async (update) => {
      if (update.message && update.message?.peerId?.channelId?.value) {
        const message = update.message.message || update.message;

        await handleTriggerInMessage(update);
        console.log('Вхідне повідомлення:', message);
      }
    });

    console.log('Повідомлення успішно надіслано!');
  } catch (error) {
    console.error('Помилка під час надсилання повідомлень:', error);
  }
};

async function handleTriggerInMessage(update) {
  try {
    const message = update.message.message || update.message;
    const chanelId = update.message?.peerId?.channelId?.value;
    const triggers = await Triggers.find({chanelId: chanelId});

    if (triggers.length > 0) {
      for (const trigger of triggers) {
        if (message.includes(trigger.triggerOn)) {
          await trigger.updateOne({ status: true });
          await controlDevice(trigger._id);
          console.log('Trigger ON:', message);
        } else if (message.includes(trigger.triggerOff)) {
          await trigger.updateOne({ status: false });
          await controlDevice(trigger._id);
          console.log('Trigger Off:', message);
        }
      }
    }
  } catch (error) {
    console.error('Помилка під час обробки повідомлень:', error);
  }
}

export{ sendAndHandleMessages };
