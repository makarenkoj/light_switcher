import 'dotenv/config';
import fetch from 'node-fetch';
import crypto from 'crypto';
const signMethod = "HMAC-SHA256";
import Devices from '../models/devicesModel.js';
import Triggers from '../models/triggersModel.js';
import DevicesTriggers from '../models/devicesTriggersModel.js';

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

async function controlDevice(deviceId) {
  try {  
    const device = await Devices.findById(deviceId);

    if (!device) {
      return { error: 'Device not found!' };
    };

    const devicesTriggers = await DevicesTriggers.find({deviceId: device._id}).sort({ createdAt: -1 });
    const triggers = await Triggers.find({_id: devicesTriggers.map(dt => dt.triggerId)}, { status: 1, _id: 0 } ).sort({ createdAt: -1 });
    const statuses = triggers.map(trigger => trigger.status);
    const status = statuses.length > 0 && statuses.every(s => s === true);

    await handleStatusDevice(deviceId, status);
    await device.updateOne({ status });

    return device.status;
  } catch (error) {
    console.error('Created Error:', error);
  }
};

async function handleStatusDevice(deviceId, status) {
  // add device 
  const device = await Devices.findById(deviceId);

  if (!device) {
    return { error: 'Device not found!' };
  };

  return status;

// mock device
// const accessId = device.accessId;
// const secretKey = device.secretKey;
  // const t = Date.now().toString();
  // const message = accessId + t + "GET\n" + "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n\n" + "/v1.0/token?grant_type=1";
  // const signature = signHMAC(message, secretKey).toUpperCase();
  // const url = "https://openapi.tuyaeu.com/v1.0/token?grant_type=1";
  // const headers = {
  //     "client_id": accessId,
  //     "sign": signature,
  //     "t": t,
  //     "sign_method": signMethod
  // };

  // try {
  //     const tokenResponse = await fetch(url, { method: "GET", headers });
  //     const tokenData = await tokenResponse.json();

  //     if (!tokenData.result || !tokenData.result.access_token) {
  //         throw new Error("Failed to get access token.");
  //     };

  //     const accessToken = tokenData.result.access_token;

  //     // Step 2: Device control request
  //     const body = {"commands": [{ "code": "switch_1", "value": status }]};
  //     const bodyHash = sha256(JSON.stringify(body));
  //     const controlMessage = `${accessId}${accessToken}${t}POST\n${bodyHash}\n\n/v1.0/devices/${deviceId}/commands`;
  //     const controlSignature = signHMAC(controlMessage, secretKey).toUpperCase();
  //     const controlUrl = `https://openapi.tuyaeu.com/v1.0/devices/${deviceId}/commands`;

  //     const controlHeaders = {
  //         "client_id": accessId,
  //         "access_token": accessToken,
  //         "sign": controlSignature,
  //         "t": t,
  //         "sign_method": signMethod,
  //         "Content-Type": "application/json"
  //     };

  //     const controlResponse = await fetch(controlUrl, {
  //         method: "POST",
  //         headers: controlHeaders,
  //         body: JSON.stringify(body)
  //     });

  //     const controlData = await controlResponse.json();
  //     console.log("Device control response:", controlData);
  //     return controlData;

  // } catch (error) {
  //     console.error("Error during device control:", error);
  // }
  // mock device response
};

async function statusDevice(deviceId) {
  const device = await Devices.findById(deviceId);

  if (!device) {
    return { error: 'Device not found!' };
  };

  const accessId = device.accessId;
  const secretKey = device.secretKey;
  const t = Date.now().toString();
  const message = accessId + t + "GET\n" + "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n\n" + "/v1.0/token?grant_type=1";
  const signature = signHMAC(message, secretKey).toUpperCase();
  const url = "https://openapi.tuyaeu.com/v1.0/token?grant_type=1";
  const headers = {
      "client_id": accessId,
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
      const nonce = crypto.randomUUID();
      const urlPath = `/v1.0/devices/${deviceId}/status`;
      const stringToSign = `GET\n${'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}\n\n${urlPath}`;
      const str = `${accessId}${accessToken}${t}${nonce}${stringToSign}`;
      const sign = signHMAC(str, secretKey).toUpperCase();
      const statusResponse = await fetch(`https://openapi.tuyaeu.com${urlPath}`, {
        method: 'GET',
        headers: {
          'client_id': accessId,
          'access_token': accessToken,
          'sign': sign,
          't': t,
          'sign_method': signMethod,
          'nonce': nonce,
        }
      });

      const statusData = await statusResponse.json();
      console.log("Device status response:", statusData);
      return statusData;
  } catch (error) {
      console.error("Error during device control:", error);
  }
};

export { controlDevice, statusDevice, handleStatusDevice };

