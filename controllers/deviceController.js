import { controlDevice, statusDevice } from '../utils/deviceUtils.js';

async function getStatus(req, res) {
  try {
    const deviceStatus = await statusDevice();
    let status = false;

    deviceStatus.result.forEach(device => {
      if (device.code === 'switch_1') {
        status = device.value;
      }
    });

    res.status(200).json({ message: `Device`, body: status });
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function changeStatus(req, res) {
  try {
    const { status } = req.body;
    const device = await controlDevice(status);
    console.log('Device:', device);

    res.status(200).json({ message: `Device is ${status ? 'ON' : 'OFF'}`, body: device });
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export { changeStatus, getStatus };
