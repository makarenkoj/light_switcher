import {getUserDeviceTriggers} from './deviceHandler.js';
import {controlDevice} from './deviceUtils.js';

async function sendAndHandleMessages(client, channelName, userMessage, channelMessage, user) {
  try {
    await client.sendMessage("me", { message: userMessage });
    await client.sendMessage(channelName, { message: channelMessage });

    client.addEventHandler(async (update) => {
      if (update.message) {
        const message = update.message.message || update.message;

        await handleTriggerInMessage(user, update, client);
        console.log('Вхідне повідомлення:', message);
      }
    });

    console.log('Повідомлення успішно надіслано!');
  } catch (error) {
    console.error('Помилка під час надсилання повідомлень:', error);
  }
};

async function handleTriggerInMessage(user, update, client) {
  try {
    const userDevicesTriggers = await getUserDeviceTriggers(user);
    const message = update.message.message || update.message;
    
    for (const { device, triggers } of userDevicesTriggers) {
      for (const trigger of triggers) {
        let chat;

        try {
          chat = await client.getEntity(trigger.chanelName);
        } catch (error) {
          console.error(`Канал ${trigger.chanelName} не знайдено:`, error);
          continue;
        }

        if (message && update?.message?.peerId?.channelId?.value === chat?.id?.value) {
          if (message?.includes(trigger.triggerOn)) {
            await trigger.updateOne({ status: true });
            await controlDevice(device._id);
            console.log('Trigger ON:', message);
          } else if (message?.includes(trigger.triggerOff)) {
            await trigger.updateOne({ status: false });
            await controlDevice(device._id);
            console.log('Trigger Off:', message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Помилка під час обробки повідомлень:', error);
  }
}

export{ sendAndHandleMessages };
