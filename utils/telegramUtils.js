import {getUserTriggers} from './deviceHandler.js';
import {controlDevice} from './deviceUtils.js';

async function sendAndHandleMessages(client, channelName, userMessage, channelMessage, user) {
  try {
    await client.sendMessage("me", { message: userMessage });
    await client.sendMessage(channelName, { message: channelMessage });

    client.addEventHandler(async (update) => {
      if (update.message) {
        const message = update.message.message;

        await handleTriggerInMessage(user, message);
        console.log('Вхідне повідомлення:', message);
      }
    });

    console.log('Повідомлення успішно надіслано!');
  } catch (error) {
    console.error('Помилка під час надсилання повідомлень:', error);
  }
};

async function handleTriggerInMessage(user, message) {
  try {
    const userDevicesTriggers = await getUserTriggers(user);
    
    for (const { device, triggers } of userDevicesTriggers) {
      for (const trigger of triggers) {
        if (message.includes(trigger.triggerOn)) {
          await controlDevice(device._id, true, device.accessId, device.secretKey) //add roolse to change devices
        } else if (message.includes(trigger.triggerOff)) {
          await controlDevice(device._id, false, device.accessId, device.secretKey)
        };
      }
    }
  } catch (error) {
    console.error('Помилка під час надсилання повідомлень:', error);
  }
};

export{ sendAndHandleMessages };
