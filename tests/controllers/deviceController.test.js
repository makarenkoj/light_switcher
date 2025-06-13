import { jest } from '@jest/globals';
import * as deviceController from '../../controllers/deviceController';
import * as deviceUtils from '../../utils/deviceUtils';
import Devices from '../../models/devicesModel';
import User from '../../models/userModel';
import DevicesTriggers from '../../models/devicesTriggersModel';
import Triggers from '../../models/triggersModel';
import { t } from '../../i18n';

jest.mock('../../utils/deviceUtils', () => ({
  controlDevice: jest.fn(),
  statusDevice: jest.fn(),
}));

jest.mock('../../models/devicesModel');
jest.mock('../../models/userModel');
jest.mock('../../models/devicesTriggersModel');
jest.mock('../../models/triggersModel');

jest.mock('../../i18n', () => ({
  t: jest.fn(key => key),
}));

let consoleErrorSpy;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe('DeviceController', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: { _id: 'userId123' },
      params: {},
      body: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    User.findById.mockReset();
    Devices.findById.mockReset();
    Devices.find.mockReset();
    Devices.findOne.mockReset();
    Devices.create.mockReset();
    Devices.countDocuments.mockReset();
    Devices.findByIdAndUpdate.mockReset();
    DevicesTriggers.find.mockReset();
    Triggers.find.mockReset();
    Triggers.countDocuments.mockReset();
    deviceUtils.controlDevice.mockReset();
    deviceUtils.statusDevice.mockReset();
    t.mockClear();
  });

  describe('create', () => {
    const deviceData = {
      name: 'Test Device',
      deviceId: 'uniqueDeviceId123',
      accessId: 'accessId123',
      secretKey: 'secretKey123',
    };
    const mockUser = { _id: 'userId123', name: 'Test User' };
    const createdDevice = { ...deviceData, userId: mockUser._id, _id: 'newDeviceId' };

    test('should successfully create the device', async () => {
      mockReq.body = deviceData;
      User.findById.mockResolvedValue(mockUser);
      Devices.findOne.mockResolvedValue(null); // Пристрій з таким deviceId не існує
      Devices.create.mockResolvedValue(createdDevice);

      await deviceController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findOne).toHaveBeenCalledWith({ deviceId: deviceData.deviceId });
      expect(Devices.create).toHaveBeenCalledWith({ ...deviceData, userId: mockUser._id });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'device.success.device_created',
        device: { device: createdDevice },
      });
    });

    test('should return 404 if user not found', async () => {
      mockReq.body = deviceData;
      User.findById.mockResolvedValue(null);

      await deviceController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.user_not_found' });
    });

    test('should return 400 if deviceId is not provided', async () => {
      mockReq.body = { ...deviceData, deviceId: undefined };
      User.findById.mockResolvedValue(mockUser);

      await deviceController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.id_required' });
    });

    test('should return 409 if deviceId already exists', async () => {
      mockReq.body = deviceData;
      User.findById.mockResolvedValue(mockUser);
      Devices.findOne.mockResolvedValue({ _id: 'existingDeviceId', deviceId: deviceData.deviceId }); // Пристрій існує

      await deviceController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findOne).toHaveBeenCalledWith({ deviceId: deviceData.deviceId });
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.id_exists' });
    });

    test('should return 422 on creation error', async () => {
      mockReq.body = deviceData;
      User.findById.mockResolvedValue(mockUser);
      Devices.findOne.mockResolvedValue(null);
      Devices.create.mockRejectedValue(new Error('DB error'));

      await deviceController.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_created' });
    });
  });

  describe('show', () => {
    const deviceId = 'deviceId456';
    const mockUser = { _id: 'userId123' };
    const mockDevice = { _id: deviceId, name: 'Living Room Lamp', userId: mockUser._id };
    const mockDevicesTriggers = [{ _id: 'dtId1', deviceId: deviceId, triggerId: 'triggerId1' }];

    beforeEach(() => {
      mockReq.params.id = deviceId;
    });

    test('must successfully return the device and its triggers', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue(mockDevice);
      DevicesTriggers.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockDevicesTriggers)
      });

      await deviceController.show(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(DevicesTriggers.find).toHaveBeenCalledWith({ deviceId: mockDevice._id });
      expect(DevicesTriggers.find({}).sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'device.success.retrieved',
        device: mockDevice,
        devicesTriggers: mockDevicesTriggers,
      });
    });

    test('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await deviceController.show(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.user_not_found' });
    });

    test('should return 404 if device not found', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue(null);

      await deviceController.show(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_found' });
    });

    test('should return 403 if the user is not authorized for this device', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue({ ...mockDevice, userId: 'anotherUserId' });

      await deviceController.show(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.authorize' });
    });
    
    test('should return 422 on general error', async () => {
      User.findById.mockRejectedValue(new Error('Some internal error'));

      await deviceController.show(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.retrieve_failed' });
    });
  });

  describe('index', () => {
    const mockUser = { _id: 'userId123' };
    const mockDevicesList = [
      { _id: 'dev1', name: 'Device 1', userId: mockUser._id },
      { _id: 'dev2', name: 'Device 2', userId: mockUser._id },
    ];

    test('should successfully return a list of devices with default pagination', async () => {
      User.findById.mockResolvedValue(mockUser);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockDevicesList),
      };
      Devices.find.mockReturnValue(mockQuery);
      Devices.countDocuments.mockResolvedValue(2);

      await deviceController.index(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.find).toHaveBeenCalledWith({ userId: mockUser._id });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(9);
      expect(Devices.countDocuments).toHaveBeenCalledWith({ userId: mockUser._id });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'device.success.retrieved',
        currentPage: 1,
        totalPages: 1,
        totalDevices: 2,
        devices: mockDevicesList,
      });
    });

    test('should successfully return a list of devices with custom pagination', async () => {
      mockReq.query = { page: '2', limit: '1' };
      User.findById.mockResolvedValue(mockUser);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockDevicesList[1]]),
      };

      Devices.find.mockReturnValue(mockQuery);
      Devices.countDocuments.mockResolvedValue(2);

      await deviceController.index(mockReq, mockRes);

      expect(mockQuery.skip).toHaveBeenCalledWith(1);
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        currentPage: 2,
        totalPages: 2,
        totalDevices: 2,
        devices: [mockDevicesList[1]],
      }));
    });

    test('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);
      await deviceController.index(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.user_not_found' });
    });

    test('should return 404 if Devices.find returns null (according to controller logic)', async () => {
      User.findById.mockResolvedValue(mockUser);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(null),
      };

      Devices.find.mockReturnValue(mockQuery);

      await deviceController.index(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_found' });
    });
    
    test('should return 200 with an empty array if there are no devices (and countDocuments = 0)', async () => {
        User.findById.mockResolvedValue(mockUser);
        const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
        };
        Devices.find.mockReturnValue(mockQuery);
        Devices.countDocuments.mockResolvedValue(0);
        
        await deviceController.index(mockReq, mockRes);
        
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            devices: [],
            totalDevices: 0,
            totalPages: 0,
        }));
    });

    test('should return 422 on general error', async () => {
        User.findById.mockRejectedValue(new Error('DB error'));
        await deviceController.index(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_found' });
    });
  });

  describe('update', () => {
    const deviceId = 'deviceId789';
    const mockUser = { _id: 'userId123' };
    const originalDevice = { _id: deviceId, name: 'Old Name', deviceId: 'oldDevId', userId: mockUser._id };
    const updateData = { name: 'New Name', deviceId: 'newUniqueDevId' };
    const updatedDeviceData = { ...originalDevice, ...updateData };

    beforeEach(() => {
      mockReq.params.id = deviceId;
      mockReq.body = updateData;
    });

    test('should successfully update the device', async () => {
        User.findById.mockResolvedValue(mockUser);
        Devices.findById.mockResolvedValue(originalDevice);
        Devices.findByIdAndUpdate.mockResolvedValue(updatedDeviceData);

        await deviceController.update(mockReq, mockRes);

        expect(User.findById).toHaveBeenCalledWith(mockUser._id);
        expect(Devices.findById).toHaveBeenCalledWith(deviceId);
        expect(Devices.findByIdAndUpdate).toHaveBeenCalledWith(
            deviceId,
            { $set: updateData },
            { new: true }
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'device.success.device_updated',
            updatedDevice: updatedDeviceData,
        });
    });

    test('should return 400 if there are no fields to update', async () => {
        mockReq.body = {};
        User.findById.mockResolvedValue(mockUser);
        Devices.findById.mockResolvedValue(originalDevice);
        
        await deviceController.update(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.nothing_to_update' });
    });

    test('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);
      Devices.findById.mockResolvedValue(originalDevice);
      Devices.findByIdAndUpdate.mockResolvedValue(updatedDeviceData);

      await deviceController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.user_not_found' });
    });

    test('Original device not found (404)', async () => {
      Devices.findById.mockResolvedValue(null);
      User.findById.mockResolvedValue(mockUser);

      await deviceController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_found' });
    });

    test('should return 403 if the user is not authorized for this device', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue({ ...originalDevice, userId: 'anotherUserId' });

      await deviceController.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.authorize' });
    });

    test('findByIdAndUpdate does not find the device (404)', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue(originalDevice);
      Devices.findByIdAndUpdate.mockResolvedValue(null);

      await deviceController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_found' });
    });

    test('should return 422 on general error', async () => {
      User.findById.mockRejectedValue(new Error('Some internal error'));

      await deviceController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_updated' });
    });
  });

  describe('remove', () => {
    const deviceId = 'deviceIdABC';
    const mockUser = { _id: 'userId123' };
    const mockDeviceInstance = { 
        _id: deviceId, 
        name: 'Device to delete', 
        userId: mockUser._id,
        deleteOne: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 })
    };

    beforeEach(() => {
        mockReq.params.id = deviceId;
    });

    test('should successfully remove the device', async () => {
        User.findById.mockResolvedValue(mockUser);
        Devices.findById.mockResolvedValue(mockDeviceInstance);

        await deviceController.remove(mockReq, mockRes);

        expect(User.findById).toHaveBeenCalledWith(mockUser._id);
        expect(Devices.findById).toHaveBeenCalledWith(deviceId);
        expect(mockDeviceInstance.deleteOne).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'device.success.device_deleted' });
    });
    
    test('User not found (404)', async () => {
      User.findById.mockResolvedValue(null);
      Devices.findById.mockResolvedValue(mockDeviceInstance);

      await deviceController.remove(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockDeviceInstance.deleteOne).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.user_not_found' });
    });

    test('Device not found (404)', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue(null);

      await deviceController.remove(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(mockDeviceInstance.deleteOne).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_found' });
    });

    test('User not authorized for device (403)', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue({ ...mockDeviceInstance, userId: 'anotherUserId' });

      await deviceController.remove(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(mockDeviceInstance.deleteOne).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.authorize' });
    });

    test('should return 422 on general error', async () => {
      User.findById.mockRejectedValue(new Error('Some internal error'));
      Devices.findById.mockResolvedValue(mockDeviceInstance);

      await deviceController.remove(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockDeviceInstance.deleteOne).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_deleted' });
    });
  });

  describe('getStatus', () => {
    const deviceId = 'statusDeviceId';
    const mockUser = { _id: 'userId123' };
    const mockDevice = { 
        _id: deviceId, 
        deviceId: 'tuyaDeviceId', 
        accessId: 'tuyaAccessId', 
        secretKey: 'tuyaSecretKey', 
        userId: mockUser._id,
        updateOne: jest.fn().mockResolvedValue({ nModified: 1 })
    };
    const mockDeviceStatusResult = { result: [{ code: 'switch_1', value: true }] };
    const mockDeviceStatusResultNotFound = { result: [{ code: 'other_status', value: true }] };

    beforeEach(() => {
        mockReq.params.id = deviceId;
    });

    test('must successfully retrieve and update device status', async () => {
        User.findById.mockResolvedValue(mockUser);
        Devices.findById.mockResolvedValue(mockDevice);
        deviceUtils.statusDevice.mockResolvedValue(mockDeviceStatusResult);

        await deviceController.getStatus(mockReq, mockRes);

        expect(User.findById).toHaveBeenCalledWith(mockUser._id);
        expect(Devices.findById).toHaveBeenCalledWith(deviceId);
        expect(deviceUtils.statusDevice).toHaveBeenCalledWith(mockDevice.deviceId, mockDevice.accessId, mockDevice.secretKey);
        expect(mockDevice.updateOne).toHaveBeenCalledWith({ status: true });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'device.success.retrieved', status: true });
    });

    test('User not found (404)', async () => {
      User.findById.mockResolvedValue(null);
      Devices.findById.mockResolvedValue(mockDevice);
      deviceUtils.statusDevice.mockResolvedValue(mockDeviceStatusResult);

      await deviceController.getStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockDevice.updateOne).toHaveBeenCalledWith({ status: true });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.user_not_found' });
    });
    
    test('Device not found (404)', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue(null);

      await deviceController.getStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.device_not_found' });
    });

    test('User not authorized for device (403)', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue({ ...mockDevice, userId: 'anotherUserId' });

      await deviceController.getStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.authorize' });
    });

    test('must successfully retrieve and update device status', async () => {
      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue(mockDevice);
      deviceUtils.statusDevice.mockResolvedValue(mockDeviceStatusResult);

      await deviceController.getStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(deviceUtils.statusDevice).toHaveBeenCalledWith(mockDevice.deviceId, mockDevice.accessId, mockDevice.secretKey);
      expect(mockDevice.updateOne).toHaveBeenCalledWith({ status: true });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'device.success.retrieved', status: true });
    });

    test('statusDevice returns an error (422)', async () => {
      User.findById.mockRejectedValue(new Error('device.errors.retrieve_failed'));

      await deviceController.getStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'device.errors.retrieve_failed' });
    });

    test("Status 'switch_1' not found or value is false", async () => {
      User.findById.mockResolvedValue(mockUser);
        Devices.findById.mockResolvedValue(mockDevice);
        deviceUtils.statusDevice.mockResolvedValue(mockDeviceStatusResultNotFound);

        await deviceController.getStatus(mockReq, mockRes);

        expect(User.findById).toHaveBeenCalledWith(mockUser._id);
        expect(Devices.findById).toHaveBeenCalledWith(deviceId);
        expect(deviceUtils.statusDevice).toHaveBeenCalledWith(mockDevice.deviceId, mockDevice.accessId, mockDevice.secretKey);
        expect(mockDevice.updateOne).toHaveBeenCalledWith({ status: false });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'device.success.retrieved', status: false });
    });
  });

  describe('changeStatus', () => {
    const deviceId = 'changeStatusDeviceId';
    const mockUser = { _id: 'userId123' };
    const mockDevice = {
      _id: deviceId,
      deviceId: 'tuyaControlDeviceId',
      accessId: 'tuyaControlAccessId',
      secretKey: 'tuyaControlSecretKey',
      userId: mockUser._id,
      updateOne: jest.fn().mockResolvedValue({ nModified: 1 })
    };
    const mockControlDeviceResponse = { success: true };
    const changeStatusTMock = (key, options) => {
      if (key === 'device.success.device_is' && options && options.status !== undefined) {
        return `Device is ${options.status}`;
      }
      if (key === 'device.success.on') return 'ON';
      if (key === 'device.success.off') return 'OFF';
      if (key === 'user.errors.user_not_found') return 'User not found';
      if (key === 'device.errors.device_not_found') return 'Device not found';
      if (key === 'device.errors.authorize') return 'Not authorized';
      if (key === 'device.errors.status_required') return 'Status is required';
      if (key === 'device.errors.control_failed' && options && options.error !== undefined) {
        return `Control failed: ${options.error.message || options.error}`;
      }

      return key;
    };

    beforeEach(() => {
      mockReq.params.id = deviceId;

      if(mockDevice && mockDevice.updateOne) {
        mockDevice.updateOne.mockClear();
      } else {
        mockDevice.updateOne = jest.fn().mockResolvedValue({ nModified: 1 });
      }

      User.findById.mockReset();
      Devices.findById.mockReset();
      deviceUtils.controlDevice.mockReset();
      t.mockClear();
      consoleErrorSpy.mockClear();

      t.mockImplementation(changeStatusTMock);

      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue(mockDevice);
    });

    test('should successfully change the device status to true', async () => {
      mockReq.body = { status: true };
      deviceUtils.controlDevice.mockResolvedValue(mockControlDeviceResponse);

      await deviceController.changeStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(deviceUtils.controlDevice).toHaveBeenCalledWith(mockDevice._id, true, mockDevice.deviceId, mockDevice.accessId, mockDevice.secretKey);
      expect(mockDevice.updateOne).toHaveBeenCalledWith({ status: true });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Device is ON',
        body: mockControlDeviceResponse
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should successfully change the device status to false', async () => {
      mockReq.body = { status: false };
      deviceUtils.controlDevice.mockResolvedValue(mockControlDeviceResponse);

      await deviceController.changeStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(deviceUtils.controlDevice).toHaveBeenCalledWith(
        mockDevice._id,
        false,
        mockDevice.deviceId,
        mockDevice.accessId,
        mockDevice.secretKey
      );
      expect(mockDevice.updateOne).toHaveBeenCalledWith({ status: false });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Device is OFF',
        body: mockControlDeviceResponse
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if user not found', async () => {
      mockReq.body = { status: true };
      User.findById.mockResolvedValue(null);

      await deviceController.changeStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(Devices.findById).not.toHaveBeenCalled();
      expect(deviceUtils.controlDevice).not.toHaveBeenCalled();
      expect(mockDevice.updateOne).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.user_not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if device not found', async () => {
      mockReq.body = { status: true };
      Devices.findById.mockResolvedValue(null);

      await deviceController.changeStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Device not found' });
      expect(deviceUtils.controlDevice).not.toHaveBeenCalled();
      expect(mockDevice.updateOne).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('device.errors.device_not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 403 if the user is not authorized for the device', async () => {
      mockReq.body = { status: true };
      Devices.findById.mockResolvedValue({ ...mockDevice, userId: 'anotherUserId' });

      await deviceController.changeStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' });
      expect(deviceUtils.controlDevice).not.toHaveBeenCalled();
      expect(mockDevice.updateOne).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('device.errors.authorize');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 422 on controlDevice error', async () => {
      mockReq.body = { status: true };
      const controlError = new Error('Tuya API connection failed');
      deviceUtils.controlDevice.mockRejectedValue(controlError);

      await deviceController.changeStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(deviceUtils.controlDevice).toHaveBeenCalledWith(mockDevice._id, true, mockDevice.deviceId, mockDevice.accessId, mockDevice.secretKey);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: controlError.message });
      expect(mockDevice.updateOne).not.toHaveBeenCalled();
      expect(t).not.toHaveBeenCalledWith('device.errors.control_failed', expect.anything());
    });

    test('should return 400 if no status is provided in the request body', async () => {
      mockReq.body = {};

      await deviceController.changeStatus(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Status is required' });
      expect(deviceUtils.controlDevice).not.toHaveBeenCalled();
      expect(mockDevice.updateOne).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('device.errors.status_required');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Status is required');
    });
  });

  describe('triggers', () => {
    const deviceId = 'deviceWithTriggersId';
    const mockUser = { _id: 'userId123' };
    const mockDevice = { _id: deviceId, userId: mockUser._id };
    const mockDevicesTriggersList = [
      { _id: 'dt1', deviceId: deviceId, triggerId: 'triggerId1' },
      { _id: 'dt2', deviceId: deviceId, triggerId: 'triggerId2' },
    ];
    const mockTriggersList = [
      { _id: 'triggerId1', name: 'Trigger 1', userId: mockUser._id },
      { _id: 'triggerId2', name: 'Trigger 2', userId: mockUser._id },
    ];

    const mockTriggersQueryBuilder = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn(),
    };

    const mockDevicesTriggersQueryBuilder = {
      sort: jest.fn(),
    };

    beforeEach(() => {
      mockReq.params.id = deviceId;
      mockReq.query = {};

      DevicesTriggers.find.mockReset();
      Triggers.find.mockReset();
      Triggers.countDocuments.mockReset();

      User.findById.mockResolvedValue(mockUser);
      Devices.findById.mockResolvedValue(mockDevice);

      DevicesTriggers.find.mockReturnValue(mockDevicesTriggersQueryBuilder);
      Triggers.find.mockReturnValue(mockTriggersQueryBuilder);
      Triggers.countDocuments.mockResolvedValue(mockTriggersList.length);

      mockDevicesTriggersQueryBuilder.sort.mockResolvedValue(mockDevicesTriggersList);
      mockTriggersQueryBuilder.limit.mockResolvedValue(mockTriggersList);

      consoleErrorSpy.mockClear();
      t.mockClear();
    });

    test('should successfully return a list of triggers for a paginated device', async () => {
      await deviceController.triggers(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(DevicesTriggers.find).toHaveBeenCalledWith({ deviceId: mockDevice._id });
      expect(mockDevicesTriggersQueryBuilder.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(Triggers.find).toHaveBeenCalledWith({
        userId: mockUser._id,
        _id: { $in: mockDevicesTriggersList.map(dt => dt.triggerId) }
      });

      expect(mockTriggersQueryBuilder.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockTriggersQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockTriggersQueryBuilder.limit).toHaveBeenCalledWith(9);
      expect(Triggers.countDocuments).toHaveBeenCalledWith({
        userId: mockUser._id,
        _id: { $in: mockDevicesTriggersList.map(dt => dt.triggerId) }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'trigger.success.retrieved',
        currentPage: 1,
        totalPages: Math.ceil(mockTriggersList.length / 9),
        totalTriggers: mockTriggersList.length,
        triggers: mockTriggersList
      }));
      expect(t).toHaveBeenCalledWith('trigger.success.retrieved');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await deviceController.triggers(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('user.errors.user_not_found') });
      expect(Devices.findById).not.toHaveBeenCalled();
      expect(DevicesTriggers.find).not.toHaveBeenCalled();
      expect(Triggers.find).not.toHaveBeenCalled();
      expect(Triggers.countDocuments).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.user_not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if device not found', async () => {
      Devices.findById.mockResolvedValue(null);

      await deviceController.triggers(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('device.errors.device_not_found') });
      expect(DevicesTriggers.find).not.toHaveBeenCalled();
      expect(Triggers.find).not.toHaveBeenCalled();
      expect(Triggers.countDocuments).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('device.errors.device_not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 403 if user is not authorized for device (requires controller fix)', async () => {
      Devices.findById.mockResolvedValue({ ...mockDevice, userId: 'anotherUserId' });

      await deviceController.triggers(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('device.errors.authorize') });
      expect(DevicesTriggers.find).not.toHaveBeenCalled();
      expect(Triggers.find).not.toHaveBeenCalled();
      expect(Triggers.countDocuments).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('device.errors.authorize');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 200 with an empty list of triggers if DevicesTriggers is empty', async () => {
      mockDevicesTriggersQueryBuilder.sort.mockResolvedValue([]);
      Triggers.find.mockImplementation((query) => {
        if (query && query._id && Array.isArray(query._id.$in) && query._id.$in.length === 0) {
          const emptyQueryBuilder = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };

          return emptyQueryBuilder;
        }

        return mockTriggersQueryBuilder;
      });

      Triggers.countDocuments.mockImplementation((query) => {
        if (query && query._id && Array.isArray(query._id.$in) && query._id.$in.length === 0) {
          return Promise.resolve(0);
        }

        return Promise.resolve(mockTriggersList.length);
      });

      await deviceController.triggers(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(DevicesTriggers.find).toHaveBeenCalledWith({ deviceId: mockDevice._id });
      expect(mockDevicesTriggersQueryBuilder.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(Triggers.find).toHaveBeenCalledWith({
        userId: mockUser._id,
        _id: { $in: [] }
      });

      expect(Triggers.countDocuments).toHaveBeenCalledWith({
        userId: mockUser._id,
        _id: { $in: [] }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'trigger.success.retrieved',
        currentPage: 1,
        totalPages: 0,
        totalTriggers: 0,
        triggers: []
      }));

      expect(t).toHaveBeenCalledWith('trigger.success.retrieved');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 422 on general error', async () => {
      const dbError = new Error('Simulated DB error');
      User.findById.mockRejectedValue(dbError);

      await deviceController.triggers(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).not.toHaveBeenCalled();
      expect(DevicesTriggers.find).not.toHaveBeenCalled();
      expect(Triggers.find).not.toHaveBeenCalled();
      expect(Triggers.countDocuments).not.toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: dbError.message });
      expect(t).toHaveBeenCalledWith('trigger.errors.triggers', { error: dbError });
      expect(consoleErrorSpy).toHaveBeenCalledWith(t('trigger.errors.triggers', { error: dbError }));
    });

    test('must use custom pagination', async () => {
      mockReq.query = { page: '3', limit: '5' };
      Triggers.countDocuments.mockResolvedValue(27);
      const mockPagedTriggersList = [{ _id: 't11' }, { _id: 't12' }, { _id: 't13' }, { _id: 't14' }, { _id: 't15' }];
      mockTriggersQueryBuilder.limit.mockResolvedValue(mockPagedTriggersList);

        await deviceController.triggers(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(Devices.findById).toHaveBeenCalledWith(deviceId);
      expect(DevicesTriggers.find).toHaveBeenCalledWith({ deviceId: mockDevice._id });
      expect(mockDevicesTriggersQueryBuilder.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(Triggers.find).toHaveBeenCalledWith({
        userId: mockUser._id,
        _id: { $in: mockDevicesTriggersList.map(dt => dt.triggerId) }
      });

      expect(mockTriggersQueryBuilder.sort).toHaveBeenCalledWith({ createdAt: -1 });
      const expectedSkip = (3 - 1) * 5;
      const expectedLimit = 5;
      expect(mockTriggersQueryBuilder.skip).toHaveBeenCalledWith(expectedSkip);
      expect(mockTriggersQueryBuilder.limit).toHaveBeenCalledWith(expectedLimit);
      expect(Triggers.countDocuments).toHaveBeenCalledWith({
        userId: mockUser._id,
      _id: { $in: mockDevicesTriggersList.map(dt => dt.triggerId) }
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'trigger.success.retrieved',
        currentPage: 3,
        totalPages: Math.ceil(27 / 5),
        totalTriggers: 27,
        triggers: mockPagedTriggersList
      }));

      expect(t).toHaveBeenCalledWith('trigger.success.retrieved');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
