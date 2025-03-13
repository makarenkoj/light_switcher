import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { createDeviceTrigger, deleteDeviceTrigger } from '../controllers/deviceTriggerController';
import DevicesTriggers from '../models/devicesTriggersModel';
import Triggers from '../models/triggersModel';
import Devices from '../models/devicesModel';
import User from '../models/userModel';

const app = express();
app.use(express.json());
app.post('/deviceTrigger/:id', createDeviceTrigger);
app.delete('/deviceTrigger/:id', deleteDeviceTrigger);

jest.mock('../models/devicesTriggersModel');
jest.mock('../models/triggersModel');
jest.mock('../models/devicesModel');
jest.mock('../models/userModel');

describe('DeviceTriggerController', () => {
  let user, device, trigger, deviceTrigger;

  beforeEach(() => {
    user = { _id: mongoose.Types.ObjectId() };
    device = { _id: mongoose.Types.ObjectId() };
    trigger = { _id: mongoose.Types.ObjectId() };
    deviceTrigger = { _id: mongoose.Types.ObjectId(), deviceId: device._id, triggerId: trigger._id };

    User.findById.mockResolvedValue(user);
    Devices.findById.mockResolvedValue(device);
    Triggers.findById.mockResolvedValue(trigger);
    DevicesTriggers.find.mockResolvedValue([]);
    DevicesTriggers.findOne.mockResolvedValue(deviceTrigger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDeviceTrigger', () => {
    it('should create a new device trigger', async () => {
      DevicesTriggers.find.mockResolvedValue([]);
      DevicesTriggers.prototype.save.mockResolvedValue(deviceTrigger);

      const res = await request(app)
        .post(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(deviceTrigger);
    });

    it('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      const res = await request(app)
        .post(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'User not found!' });
    });

    it('should return 404 if device not found', async () => {
      Devices.findById.mockResolvedValue(null);

      const res = await request(app)
        .post(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Device not found!' });
    });

    it('should return 404 if trigger not found', async () => {
      Triggers.findById.mockResolvedValue(null);

      const res = await request(app)
        .post(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Trigger not found!' });
    });

    it('should return 409 if device trigger already exists', async () => {
      DevicesTriggers.find.mockResolvedValue([deviceTrigger]);

      const res = await request(app)
        .post(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Device Trigger already exists!' });
    });
  });

  describe('deleteDeviceTrigger', () => {
    it('should delete an existing device trigger', async () => {
      const res = await request(app)
        .delete(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(deviceTrigger);
    });

    it('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'User not found!' });
    });

    it('should return 404 if device not found', async () => {
      Devices.findById.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Device not found!' });
    });

    it('should return 404 if trigger not found', async () => {
      Triggers.findById.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Trigger not found!' });
    });

    it('should return 404 if device trigger not found', async () => {
      DevicesTriggers.findOne.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/deviceTrigger/${device._id}`)
        .send({ triggerId: trigger._id })
        .set('user', user);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Device Trigger not found!' });
    });
  });
});
