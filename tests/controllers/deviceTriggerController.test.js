import { jest } from '@jest/globals';
import * as deviceTriggerController from '../../controllers/deviceTriggerController';
import DevicesTriggers from '../../models/devicesTriggersModel';
import Triggers from '../../models/triggersModel';
import Devices from '../../models/devicesModel';
import User from '../../models/userModel';
import { t } from '../../i18n';

jest.mock('../../models/devicesTriggersModel');
jest.mock('../../models/triggersModel');
jest.mock('../../models/devicesModel');
jest.mock('../../models/userModel');
jest.mock('../../i18n', () => ({
  t: jest.fn(key => key),
}));

let consoleErrorSpy;
let consoleLogSpy;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

describe('DeviceTriggerController', () => {
  let mockReq;
  let mockRes;
  const mockUserId = 'userTestId123';
  const mockDeviceId = 'deviceTestId456';
  const mockTriggerId = 'triggerTestId789';
  const mockUser = { _id: mockUserId };
  const mockDevice = { _id: mockDeviceId };
  const mockTrigger = { _id: mockTriggerId };

  beforeEach(() => {
    mockReq = {
      user: { _id: mockUserId },
      params: { id: mockDeviceId },
      body: { triggerId: mockTriggerId },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    User.findById.mockReset();
    Devices.findById.mockReset();
    Triggers.findById.mockReset();
    DevicesTriggers.find.mockReset();
    DevicesTriggers.findOne.mockReset();

    if (DevicesTriggers.mockClear) {
      DevicesTriggers.mockClear();
    }

    t.mockClear();

    User.findById.mockResolvedValue(mockUser);
    Devices.findById.mockResolvedValue(mockDevice);
    Triggers.findById.mockResolvedValue(mockTrigger);
  });

  describe('createDeviceTrigger', () => {
    let mockSave;
    let mockDeviceTriggerInstance;

    const mockFindQuery = {
        sort: jest.fn()
    };

    beforeEach(() => {
      mockSave = jest.fn();
      mockDeviceTriggerInstance = {
        deviceId: mockDeviceId,
        triggerId: mockTriggerId,
        save: mockSave,
        _id: 'newDtId123',
        toJSON: function() { return { _id: this._id, deviceId: this.deviceId, triggerId: this.triggerId }; }
      };

      DevicesTriggers.mockImplementation(() => mockDeviceTriggerInstance);
      DevicesTriggers.find.mockReturnValue(mockFindQuery);
      mockFindQuery.sort.mockResolvedValue([]);
      mockSave.mockResolvedValue(mockDeviceTriggerInstance);
    });

    test('must successfully establish a device-trigger connection', async () => {
      await deviceTriggerController.createDeviceTrigger(mockReq, mockRes);

      expect(DevicesTriggers.find).toHaveBeenCalledWith({ deviceId: mockDeviceId, triggerId: mockTriggerId });
      expect(mockFindQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(DevicesTriggers).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockDeviceTriggerInstance);
    });

    test('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);
      await deviceTriggerController.createDeviceTrigger(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.user_not_found' });
      expect(mockSave).not.toHaveBeenCalled();
    });

    test('should return 404 if device not found', async () => {
      Devices.findById.mockResolvedValue(null);
      await deviceTriggerController.createDeviceTrigger(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.not_found' });
      expect(mockSave).not.toHaveBeenCalled();
    });

    test('should return 404 if trigger not found', async () => {
      Triggers.findById.mockResolvedValue(null);
      await deviceTriggerController.createDeviceTrigger(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'trigger.errors.trigger_not_found' });
      expect(mockSave).not.toHaveBeenCalled();
    });

    test('should return 409 if the connection already exists', async () => {
      const mockExistingLink = [{ _id: 'existingId' }];
      mockFindQuery.sort.mockResolvedValue(mockExistingLink);

      await deviceTriggerController.createDeviceTrigger(mockReq, mockRes);

      expect(DevicesTriggers.find).toHaveBeenCalledWith({ deviceId: mockDeviceId, triggerId: mockTriggerId });
      expect(mockFindQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.alredy_exists_dt' });
      expect(mockSave).not.toHaveBeenCalled();
    });

    test('should return 400 on save error (catch block)', async () => {
      const saveError = new Error('Database save error');
      mockSave.mockRejectedValue(saveError);
      mockFindQuery.sort.mockResolvedValue([]);

      await deviceTriggerController.createDeviceTrigger(mockReq, mockRes);

      expect(DevicesTriggers).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: saveError.message });
    });
  });

  describe('deleteDeviceTrigger', () => {
    let mockDeleteOne;
    let mockFoundDeviceTrigger;

    beforeEach(() => {
      mockDeleteOne = jest.fn();
      mockFoundDeviceTrigger = {
        _id: 'dtExistingId',
        deviceId: mockDeviceId,
        triggerId: mockTriggerId,
        deleteOne: mockDeleteOne,
        toJSON: function() { return { _id: this._id, deviceId: this.deviceId, triggerId: this.triggerId }; }
      };

      DevicesTriggers.findOne.mockResolvedValue(mockFoundDeviceTrigger);
      mockDeleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 1 });
    });

    test('should successfully remove the device-trigger association', async () => {
      await deviceTriggerController.deleteDeviceTrigger(mockReq, mockRes);

      expect(DevicesTriggers.findOne).toHaveBeenCalledWith({ deviceId: mockDeviceId, triggerId: mockTriggerId });
      expect(mockDeleteOne).toHaveBeenCalledTimes(1); 
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockFoundDeviceTrigger);
    });

    test('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);
      await deviceTriggerController.deleteDeviceTrigger(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.user_not_found' });
      expect(mockDeleteOne).not.toHaveBeenCalled();
    });

    test('should return 404 if device not found', async () => {
      Devices.findById.mockResolvedValue(null);
      await deviceTriggerController.deleteDeviceTrigger(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.not_found' });
      expect(mockDeleteOne).not.toHaveBeenCalled();
    });

    test('should return 404 if trigger not found', async () => {
      Triggers.findById.mockResolvedValue(null);
      await deviceTriggerController.deleteDeviceTrigger(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'trigger.errors.trigger_not_found' });
      expect(mockDeleteOne).not.toHaveBeenCalled();
    });

    test('should return 404 if link not found to delete', async () => {
      DevicesTriggers.findOne.mockResolvedValue(null);
      await deviceTriggerController.deleteDeviceTrigger(mockReq, mockRes);
      expect(DevicesTriggers.findOne).toHaveBeenCalledWith({ deviceId: mockDeviceId, triggerId: mockTriggerId });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.dt_not_found' });
      expect(mockDeleteOne).not.toHaveBeenCalled();
    });

    test('should return 400 on deletion error (catch block)', async () => {
      const deleteError = new Error('DB delete error');
      mockDeleteOne.mockRejectedValue(deleteError);
      DevicesTriggers.findOne.mockResolvedValue(mockFoundDeviceTrigger);

      await deviceTriggerController.deleteDeviceTrigger(mockReq, mockRes);

      expect(mockDeleteOne).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: deleteError.message });
    });
  });
});
