require('dotenv').config()
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input"); // npm i input
const TuyaDevice = require('tuyapi');

const {API_ID, API_HASH, PHONE, PASSWORD, DEVICE_ID, KEY_ID} = process.env
const apiId = API_ID;
const apiHash = API_HASH;
const stringSession = new StringSession("");

// Налаштування Tuya(SmartLife)
const lightDevice = new TuyaDevice({
  id: DEVICE_ID,         //ID пристрою
  key: KEY_ID,       //ключ пристрою
  // ip: 'your-device-ip',         //IP-адресa пристрою optional
});

const manageLight = (alarm, electricity) => {
  if (!alarm && electricity) {
    console.log('Умови позитивні: вмикаємо світло.');
    lightDevice.set({ set: true });
  } else {
    console.log('Умови негативні: вимикаємо світло.');
    lightDevice.set({ set: false });
  }
};

let alarmState = true, 
    electricityState = true;

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    // phoneNumber: async () => await input.text("Будь ласка, введіть свій номер: "),
    phoneNumber: PHONE,
    password: async () => await input.text("Будь ласка, введіть свій пароль: "),
    // password: PASSWORD,
    phoneCode: async () =>
      await input.text("Будь ласка, введіть код, який ви отримали: "),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  console.log('Успішно увійшли в систему!');
  console.log(client.session.save()); // Save this string to avoid logging in again
  await client.sendMessage("me", { message: "Hello!" });
  await client.sendMessage("raketayyy", { message: 'Hello Chanel' });
  await client.sendMessage("+393519629923", { message: 'Hello Chanel' });

  const chat = await client.getEntity('@borik_officially'),
        borik_chat_id = chat.id?.value;
  console.log('Отримали чат:', chat);

  const power_chat = await client.getEntity('@power_prystolychka'),
        power_chat_id = power_chat.id?.value;
  console.log('Отримали чат:', power_chat);

  console.log(`BORIK id: ${borik_chat_id}`)
  console.log(`POWER id: ${power_chat_id}`)

  client.addEventHandler((update) => {
    if (update.message && update.message?.peerId?.channelId) {
        const message = update.message.message;
        const chanelId = update.message?.peerId?.channelId;

        console.log(update);
        console.log(`Chanel id: ${chanelId}/ Borik id: ${borik_chat_id}/ Power id: ${power_chat_id}`);
        console.log(chanelId == borik_chat_id || chanelId == power_chat_id ? true : false);

        if (message.includes('🔴 Київська область - повітряна тривога!')) {
            console.log('Отримано тривогу! Вимикаємо світло.');
            alarmState = true;
            client.sendMessage("raketayyy", { message: `${message} \n Chanel id: ${chanelId} \n Отримано тривогу! Вимикаємо світло.`});
            manageLight(alarmState, electricityState);
        } else if (message.includes('🟢 Київська область - відбій повітряної тривоги!')) {
            console.log('Відбій тривоги! Вмикаємо світло.');
            alarmState = false;
            client.sendMessage("raketayyy", { message: `${message} \n Chanel id: ${chanelId} \n Відбій тривоги! Вмикаємо світло.`});
            manageLight(alarmState, electricityState);
        }

        if (message.includes('⚫️ Щасливе (Лесі Українки, 14)')) {
          console.log('Cвітла нема! Вимикаємо світло.');
          electricityState = false;
          client.sendMessage("raketayyy", { message: `${message} \n Chanel id: ${chanelId} \n Cвітла нема! Вимикаємо світло.`});
          manageLight(alarmState, electricityState);
        } else if (message.includes('🟣 Щасливе (Лесі Українки, 14)')) {
          console.log('Cвітло є! Вмикаємо світло.');
          electricityState = true;
          client.sendMessage("raketayyy", { message: `${message} \n Chanel id: ${chanelId} \n Cвітло є! Вмикаємо світло.`});
          manageLight(alarmState, electricityState);
        }
    }
  });
})();
