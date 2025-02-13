import {getUserTriggers} from './deviceHandler.js';
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
    const userDevicesTriggers = await getUserTriggers(user);
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

        if (update?.message && update?.message?.peerId?.channelId?.value === chat?.id?.value) {
          if (message?.includes(trigger.triggerOn)) {
            console.log('Trigger ON:', message);
            await controlDevice(device._id, true, device.accessId, device.secretKey);
          } else if (message?.includes(trigger.triggerOff)) {
            console.log('Trigger Off:', message);
            await controlDevice(device._id, false, device.accessId, device.secretKey);
          }
        } else if (message?.includes(trigger.triggerOff)) {
          await controlDevice(device._id, false, device.accessId, device.secretKey);
        }
      }
    }
  } catch (error) {
    console.error('Помилка під час обробки повідомлень:', error);
  }
}

export{ sendAndHandleMessages };
