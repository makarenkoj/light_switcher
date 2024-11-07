require('dotenv').config()
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const crypto = require('crypto');
const fetch = require('node-fetch');
const { DateTime } = require('luxon');
const SunCalc = require('suncalc');

const {API_ID, API_HASH, ACCESS_ID, ACCESS_SECRET, PHONE, DEVICE_ID, INFO_CHANEL_NAME, LATITUDE, LONGITUDE} = process.env
const apiId = API_ID;
const apiHash = API_HASH;
const stringSession = new StringSession("");
const signMethod = "HMAC-SHA256";
let currentDate = DateTime.now().setZone("Europe/Kiev")

let alarmState = false, 
    electricityState = true;

// Function to generate HMAC-SHA256 signature
function signHMAC(message, secretKey) {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message);
  return hmac.digest('hex');
}

// Function to create SHA256 hash
function sha256(message) {
  const hash = crypto.createHash('sha256');
  hash.update(message);
  return hash.digest("hex");
}

// Function to get access token and control device
async function controlDevice(status) {
  const t = Date.now().toString();
  const clientId = ACCESS_ID;
  const secretKey = ACCESS_SECRET;

  // Step 1: Generate token request signature
  const message = clientId + t + "GET\n" + "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n\n" + "/v1.0/token?grant_type=1";
  const signature = signHMAC(message, secretKey).toUpperCase();
  const url = "https://openapi.tuyaeu.com/v1.0/token?grant_type=1";
  const headers = {
      "client_id": clientId,
      "sign": signature,
      "t": t,
      "sign_method": signMethod
  };

  try {
      const tokenResponse = await fetch(url, { method: "GET", headers });
      const tokenData = await tokenResponse.json();

      if (!tokenData.result || !tokenData.result.access_token) {
          throw new Error("Failed to get access token.");
      };

      const accessToken = tokenData.result.access_token;

      // Step 2: Device control request
      const body = {"commands": [{ "code": "switch_1", "value": status }]};
      const bodyHash = sha256(JSON.stringify(body));
      const controlMessage = `${clientId}${accessToken}${t}POST\n${bodyHash}\n\n/v1.0/devices/${DEVICE_ID}/commands`;
      const controlSignature = signHMAC(controlMessage, secretKey).toUpperCase();
      const controlUrl = `https://openapi.tuyaeu.com/v1.0/devices/${DEVICE_ID}/commands`;

      const controlHeaders = {
          "client_id": clientId,
          "access_token": accessToken,
          "sign": controlSignature,
          "t": t,
          "sign_method": signMethod,
          "Content-Type": "application/json"
      };

      const controlResponse = await fetch(controlUrl, {
          method: "POST",
          headers: controlHeaders,
          body: JSON.stringify(body)
      });

      const controlData = await controlResponse.json();
      console.log("Device control response:", controlData);

  } catch (error) {
      console.error("Error during device control:", error);
  }
};

function isTimeAfterSunsetOrBeforeSunrise(latitude, longitude, date = new Date()) {
  // Розраховуємо час сходу та заходу сонця
  const times = SunCalc.getTimes(date, latitude, longitude);
  const sunrise = DateTime.fromJSDate(times.sunrise);
  const sunset = DateTime.fromJSDate(times.sunset);

  // Отримуємо поточний час у часовому поясі, відповідному до координат
  const now = DateTime.now().setZone(sunrise.zoneName);

  console.log(`Date now: ${now}\nToday sunrise: ${sunrise}\nToday sunset: ${sunset}`);

  // Перевіряємо умови
  const isAfterSunset = now > sunset.plus({ minutes: 20 });
  const isBeforeSunrise = now < sunrise.plus({ minutes: 20 });

  console.log(`Is after sunset: ${isAfterSunset}\nIs before sunrise: ${isBeforeSunrise}`)
  return isAfterSunset && !isBeforeSunrise;
};

// Run the function device control
const manageLight = (alarm, electricity, latitude, longitude, date) => {
  if (!alarm && electricity && isTimeAfterSunsetOrBeforeSunrise(latitude, longitude, date)) {
    console.log('Alarm:', !alarm);
    console.log('Power:', electricity);
    console.log('Suntime:', isTimeAfterSunsetOrBeforeSunrise(latitude, longitude, date));
    console.log('Умови позитивні: вмикаємо світло.');
    controlDevice(true);
    return true
  } else {
    console.log('Alarm:', !alarm);
    console.log('Power:', electricity);
    console.log('Suntime:', isTimeAfterSunsetOrBeforeSunrise(latitude, longitude, date));
    console.log('Умови негативні: вимикаємо світло.');
    controlDevice(false);
    return false
  }
};

// Run telegram 
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

        console.log(`Chanel id: ${chanelId}/ Borik id: ${borik_chat_id}/ Power id: ${power_chat_id}`);
        console.log(chanelId == borik_chat_id || chanelId == power_chat_id ? update : 'Not info chanel!');

        if (message?.includes('🔴')) {
            console.log(`${message} \n Chanel id: ${chanelId} \n Отримано тривогу!`);
            alarmState = true;
            client.sendMessage(INFO_CHANEL_NAME, { message: 'Отримано тривогу!'});
            manageLight(alarmState, electricityState, LATITUDE, LONGITUDE, currentDate) ? client.sendMessage(INFO_CHANEL_NAME, { message: 'Умови позитивні: вмикаємо світло.'}) : client.sendMessage(INFO_CHANEL_NAME, { message: 'Умови негативні: вимикаємо світло.'});
        } else if (message?.includes('🟢')) {
            console.log(`${message} \n Chanel id: ${chanelId} \n Відбій тривоги!`);
            alarmState = false;
            client.sendMessage(INFO_CHANEL_NAME, { message: 'Відбій тривоги!'})
            manageLight(alarmState, electricityState, LATITUDE, LONGITUDE, currentDate) ? client.sendMessage(INFO_CHANEL_NAME, { message: 'Умови позитивні: вмикаємо світло.'}) : client.sendMessage(INFO_CHANEL_NAME, { message: 'Умови негативні.'});
        }

        if (message?.includes('⚫️ Щасливе (Лесі Українки, 14)')) {
          console.log(`${message} \n Chanel id: ${chanelId} \n Cвітла нема!`);
          electricityState = false;
          client.sendMessage(INFO_CHANEL_NAME, { message: 'Cвітла нема!'});
          manageLight(alarmState, electricityState, LATITUDE, LONGITUDE, currentDate)  ? client.sendMessage(INFO_CHANEL_NAME, { message: 'Умови позитивні: вмикаємо світло.'}) : client.sendMessage(INFO_CHANEL_NAME, { message: 'Умови негативні: вимикаємо світло.'});
        } else if (message?.includes('🟣 Щасливе (Лесі Українки, 14)')) {
          console.log(`${message} \n Chanel id: ${chanelId} \n Cвітло є!`);
          electricityState = true;
          client.sendMessage(INFO_CHANEL_NAME, { message: 'Cвітло є!'});
          manageLight(alarmState, electricityState, LATITUDE, LONGITUDE, currentDate) ? client.sendMessage(INFO_CHANEL_NAME, { message: 'Умови позитивні: вмикаємо світло.'}) : client.sendMessage(INFO_CHANEL_NAME, { message: 'Умови негативні.'});
        }
    }
  });
})();
