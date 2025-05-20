import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import Session from '../../models/sessionModel.js';
import { prepareSRP } from '../../utils/srpHelper.js';
import { sendAndHandleMessages } from '../../utils/telegramUtils.js';
import User from '../../models/userModel.js';
import Telegram from '../../models/telegramModel.js';
import { t } from '../../i18n.js';
import { server } from '../../app.js';

jest.mock('dotenv');
dotenv.config.mockImplementation(() => {});

jest.mock('telegram', () => ({
  Api: {
    auth: {
      SendCode: jest.fn(),
      SignIn: jest.fn(),
      CheckPassword: jest.fn(),
    },
    account: {
        GetPassword: jest.fn(),
    },
    channels: {
        JoinChannel: jest.fn(),
        GetParticipant: jest.fn(),
    }
  },
  TelegramClient: jest.fn(),
}));
jest.mock('telegram/sessions/index.js', () => ({
  StringSession: jest.fn(),
}));

jest.mock('../../models/sessionModel.js');
jest.mock('../../models/userModel.js');
jest.mock('../../models/telegramModel.js');

jest.mock('../../utils/srpHelper.js');
jest.mock('../../utils/telegramUtils.js');

jest.mock('../../i18n.js', () => ({
  t: jest.fn(key => key),
}));

import * as telegramController from '../../controllers/telegramController.js';

let consoleErrorSpy;
let mockUserId;
let mockTelegramId;
let mockSessionId;
let mockApiId;
let mockApiHash;
let mockChannel;
let mockPhoneNumber;
let mockPhoneCodeHash;
let mockCode;
let mockPassword;
let mockSrpId;
let mockSrpA;
let mockSrpM1;
let mockUser;
let mockAdminUser;
let mockTelegram;
let mockSessionData;
let mockClientInstance;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  mockUserId = 'user123';
  mockTelegramId = 'telegram456';
  mockSessionId = 'session789';
  mockApiId = 12345;
  mockApiHash = 'mockApiHash123';
  mockChannel = 'mockChannelName';
  mockPhoneNumber = '1234567890';
  mockPhoneCodeHash = 'mockCodeHash';
  mockCode = '12345';
  mockPassword = 'mockPassword';
  mockSrpId = 'mockSrpId';
  mockSrpA = Buffer.from('mockA');
  mockSrpM1 = Buffer.from('mockM1');
  mockUser = { _id: mockUserId, phoneNumber: mockPhoneNumber, role: 'user' };
  mockAdminUser = { _id: 'admin123', phoneNumber: 'adminPhone', role: 'admin' };
  mockTelegram = {
    _id: mockTelegramId,
    userId: mockUserId,
    apiId: 'encryptedApiId',
    apiHash: 'encryptedApiHash',
    channel: mockChannel,
    getDecryptedApiId: jest.fn().mockReturnValue(mockApiId),
    getDecryptedApiHash: jest.fn().mockReturnValue(mockApiHash),
    deleteOne: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 })
  };

  mockSessionData = {
      userId: mockUserId,
      session: 'mockSessionString123',
  };

  mockClientInstance = {
    connect: jest.fn().mockResolvedValue(true),
    isUserAuthorized: jest.fn(),
    invoke: jest.fn(),
    session: {
        save: jest.fn().mockReturnValue('newMockSessionString')
    },
    getMe: jest.fn(),
  };

  TelegramClient.mockImplementation(() => mockClientInstance);
  StringSession.mockImplementation((session) => ({
      session: session,
      save: jest.fn().mockReturnValue(session),
  }));

  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe('Telegram Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: { _id: mockUserId },
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
    User.findOne.mockReset();
    Telegram.findOne.mockReset();
    Telegram.create.mockReset();
    Telegram.findByIdAndUpdate.mockReset();
    Telegram.findById.mockReset();
    Session.findOne.mockReset();
    Session.findOneAndUpdate.mockReset();
    prepareSRP.mockReset();
    sendAndHandleMessages.mockReset();
    t.mockClear();

    TelegramClient.mockClear();
    StringSession.mockClear();
    mockClientInstance.connect.mockReset().mockResolvedValue(true);
    mockClientInstance.isUserAuthorized.mockReset();
    mockClientInstance.invoke.mockReset();
    mockClientInstance.session.save.mockReset().mockReturnValue('newMockSessionString');
    mockClientInstance.getMe.mockReset();
    Api.auth.SendCode.mockReset();
    Api.auth.SignIn.mockReset();
    Api.auth.CheckPassword.mockReset();
    Api.account.GetPassword.mockReset();
    Api.channels.JoinChannel.mockReset();
    Api.channels.GetParticipant.mockReset();

    consoleErrorSpy.mockClear();

    mockTelegram.getDecryptedApiId.mockClear().mockReturnValue(mockApiId);
    mockTelegram.getDecryptedApiHash.mockClear().mockReturnValue(mockApiHash);
    mockTelegram.deleteOne.mockClear().mockResolvedValue({ acknowledged: true, deletedCount: 1 });

    User.findById.mockResolvedValue(mockUser);
  });

  afterAll((done) => {
    server.close((err) => {
      if (err) {
        console.error('--> Error closing server for Telegram Controller suite:', err);
        done(err);
      } else {
        done();
      }
    });
  });

  describe('show', () => {
    test('should successfully restore Telegram configuration', async () => {
      Telegram.findOne.mockResolvedValue(mockTelegram);

      await telegramController.show(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(mockTelegram.getDecryptedApiId).toHaveBeenCalled();
      expect(mockTelegram.getDecryptedApiHash).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: t('telegram.success.retrieved'),
        telegram: {
          ...mockTelegram,
          apiId: mockApiId,
          apiHash: mockApiHash,
        },
      });
      expect(t).toHaveBeenCalledWith('telegram.success.retrieved');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await telegramController.show(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('user.errors.user_not_found') });
      expect(Telegram.findOne).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.user_not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if Telegram configuration not found', async () => {
      Telegram.findOne.mockResolvedValue(null);

      await telegramController.show(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.not_found') });
      expect(mockTelegram.getDecryptedApiId).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('telegram.errors.not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 422 on general error', async () => {
      const dbError = new Error('Show DB error');
      User.findById.mockRejectedValue(dbError);

      await telegramController.show(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.retrieve_failed', {error: dbError}) });
      expect(Telegram.findOne).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('telegram.errors.retrieve_failed', { error: dbError });
      expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.retrieve_failed', { error: dbError }));
    });
  });

  describe('create', () => {
    const newTelegramData = {
      apiId: 67890,
      apiHash: 'newHash456',
      channel: 'newChannel',
    };
    const createdTelegram = {
      _id: 'newTelegramId',
      userId: mockUserId,
      ...newTelegramData
    };

    test('should successfully create Telegram configuration', async () => {
      mockReq.body = newTelegramData;
      Telegram.findOne.mockResolvedValue(null);
      Telegram.create.mockResolvedValue(createdTelegram);

      await telegramController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(Telegram.create).toHaveBeenCalledWith({ ...newTelegramData, userId: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: t('telegram.success.create'),
        telegram: createdTelegram,
      });
      expect(t).toHaveBeenCalledWith('telegram.success.create');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if user not found', async () => {
      mockReq.body = newTelegramData;
      User.findById.mockResolvedValue(null);

      await telegramController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('user.errors.user_not_found') });
      expect(Telegram.findOne).not.toHaveBeenCalled();
      expect(Telegram.create).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.user_not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 409 if Telegram configuration already exists', async () => {
      mockReq.body = newTelegramData;
      Telegram.findOne.mockResolvedValue(mockTelegram);

      await telegramController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.exists') });
      expect(Telegram.create).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('telegram.exists');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 422 if required data is missing in the request body', async () => {
      mockReq.body = { apiId: 123, apiHash: 'abc' };

      await telegramController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('errors.missing.data') });
      expect(Telegram.create).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('errors.missing.data');
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      mockReq.body = { channel: 'abc', apiHash: 'abc' };
      await telegramController.create(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('errors.missing.data') });
      expect(t).toHaveBeenCalledWith('errors.missing.data');

      mockReq.body = { apiId: 123, channel: 'abc' };
      await telegramController.create(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('errors.missing.data') });
      expect(t).toHaveBeenCalledWith('errors.missing.data');
    });

    test('should return 409 on duplicate key error (code 11000)', async () => {
      mockReq.body = newTelegramData;
      Telegram.findOne.mockResolvedValue(null);
      const duplicateError = new Error('Duplicate key error');
      duplicateError.code = 11000;
      duplicateError.keyPattern = { someField: 1 };
      Telegram.create.mockRejectedValue(duplicateError);

      await telegramController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(Telegram.create).toHaveBeenCalledWith({ ...newTelegramData, userId: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
          error: t('telegram.errors.dublication', {duplicateField: 'someField'}),
          field: 'someField',
      });
      expect(t).toHaveBeenCalledWith('telegram.errors.dublication', {duplicateField: 'someField'});
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 422 on other creation error', async () => {
      mockReq.body = newTelegramData;
      Telegram.findOne.mockResolvedValue(null);
      const createError = new Error('Other creation error');
      Telegram.create.mockRejectedValue(createError);

      await telegramController.create(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(Telegram.create).toHaveBeenCalledWith({ ...newTelegramData, userId: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.creat') });
      expect(t).toHaveBeenCalledWith('telegram.errors.creat', {error: createError});
      expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.creat', {error: createError}));
    });
  });

  describe('update', () => {
    const updateTelegramData = {
        channel: 'updatedChannel',
        apiId: 98765,
    };
    const updatedTelegram = {
        _id: mockTelegramId,
        userId: mockUserId,
        apiId: 'updatedEncryptedApiId',
        apiHash: 'encryptedApiHash',
        channel: 'updatedChannel',
        getDecryptedApiId: jest.fn().mockReturnValue(updateTelegramData.apiId),
        getDecryptedApiHash: jest.fn().mockReturnValue(mockApiHash),
        deleteOne: jest.fn(),
    };

    test('should successfully update Telegram configuration', async () => {
      mockReq.body = updateTelegramData;
      Telegram.findOne.mockResolvedValue(mockTelegram);
      Telegram.findByIdAndUpdate.mockResolvedValue(updatedTelegram);

      await telegramController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(Telegram.findByIdAndUpdate).toHaveBeenCalledWith(
          mockTelegram._id,
          updateTelegramData,
          { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: t('telegram.success.update'),
        telegram: updatedTelegram,
      });
      expect(t).toHaveBeenCalledWith('telegram.success.update');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if user not found', async () => {
      mockReq.body = updateTelegramData;
      User.findById.mockResolvedValue(null);

      await telegramController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('user.errors.user_not_found') });
      expect(Telegram.findOne).not.toHaveBeenCalled();
      expect(Telegram.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.user_not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if Telegram configuration for the user is not found', async () => {
      mockReq.body = updateTelegramData;
      Telegram.findOne.mockResolvedValue(null);

      await telegramController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.not_found') });
      expect(Telegram.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('telegram.errors.not_found');
      expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.not_found'));
    });

    test('should return 422 if there are no fields to update in the request body', async () => {
      mockReq.body = {};
      Telegram.findOne.mockResolvedValue(mockTelegram);

      await telegramController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.nothing_to_update') });
      expect(Telegram.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('telegram.errors.nothing_to_update');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if findByIdAndUpdate returns null (unexpected scenario)', async () => {
      mockReq.body = updateTelegramData;
      Telegram.findOne.mockResolvedValue(mockTelegram);
      Telegram.findByIdAndUpdate.mockResolvedValue(null);

      await telegramController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(Telegram.findByIdAndUpdate).toHaveBeenCalledWith(
          mockTelegram._id,
          updateTelegramData,
          { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.updated') });
      expect(t).toHaveBeenCalledWith('telegram.errors.updated');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 422 on a general update error', async () => {
      mockReq.body = updateTelegramData;
      Telegram.findOne.mockResolvedValue(mockTelegram);
      const updateError = new Error('Update DB error');
      Telegram.findByIdAndUpdate.mockRejectedValue(updateError);

      await telegramController.update(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(Telegram.findByIdAndUpdate).toHaveBeenCalledWith(
          mockTelegram._id,
          updateTelegramData,
          { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.failed_update', {error: updateError}) });
      expect(t).toHaveBeenCalledWith('telegram.errors.failed_update', {error: updateError});
      expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.failed_update', {error: updateError}));
    });
  });

  describe('remove', () => {
    test('should successfully delete Telegram configuration', async () => {
      mockReq.params.id = mockTelegramId;
      Telegram.findById.mockResolvedValue(mockTelegram);

      await telegramController.remove(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findById).toHaveBeenCalledWith(mockTelegramId);
      expect(mockTelegram.deleteOne).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: t('telegram.success.delete') });
      expect(t).toHaveBeenCalledWith('telegram.success.delete');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if user not found', async () => {
      mockReq.params.id = mockTelegramId;
      User.findById.mockResolvedValue(null);

      await telegramController.remove(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('user.errors.user_not_found') });
      expect(Telegram.findById).not.toHaveBeenCalled();
      expect(mockTelegram.deleteOne).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.user_not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 404 if Telegram configuration not found by ID', async () => {
      mockReq.params.id = mockTelegramId;
      Telegram.findById.mockResolvedValue(null);

      await telegramController.remove(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findById).toHaveBeenCalledWith(mockTelegramId);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.not_found') });
      expect(mockTelegram.deleteOne).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('telegram.errors.not_found');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 403 if the user is not authorized to delete the configuration', async () => {
      mockReq.params.id = mockTelegramId;
      const anotherUserTelegram = { ...mockTelegram, userId: 'anotherUserId' };
      anotherUserTelegram.deleteOne = jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 });
      Telegram.findById.mockResolvedValue(anotherUserTelegram);

      await telegramController.remove(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findById).toHaveBeenCalledWith(mockTelegramId);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.authorize_delete') });
      expect(anotherUserTelegram.deleteOne).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('telegram.errors.authorize_delete');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return 422 on a general delete error', async () => {
      mockReq.params.id = mockTelegramId;
      Telegram.findById.mockResolvedValue(mockTelegram);
      const deleteError = new Error('Delete DB error');
      mockTelegram.deleteOne.mockRejectedValue(deleteError);

      await telegramController.remove(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Telegram.findById).toHaveBeenCalledWith(mockTelegramId);
      expect(mockTelegram.deleteOne).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.delete', {error: deleteError}) });
      expect(t).toHaveBeenCalledWith('telegram.errors.delete', {error: deleteError});
      expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.delete', {error: deleteError}));
    });
  });

  // describe('initializeClient', () => {
  //   test('повинен ініціалізувати клієнт та повернути true, якщо користувач авторизований (і сесія існує)', async () => {
  //     // User.findById налаштований на успіх в beforeEach
  //     Session.findOne.mockResolvedValue(mockSessionData); // Сесія існує
  //     Telegram.findOne.mockResolvedValue(mockTelegram); // Telegram конфіг існує
  //     mockClientInstance.isUserAuthorized.mockResolvedValue(true); // Користувач авторизований

  //     const result = await telegramController.initializeClient(mockUserId);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(StringSession).toHaveBeenCalledWith(mockSessionData.session); // StringSession створено з даними сесії
  //     expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(mockTelegram.getDecryptedApiId).toHaveBeenCalled();
  //     expect(mockTelegram.getDecryptedApiHash).toHaveBeenCalled();
  //     // Перевіряємо виклик конструктора TelegramClient
  //     expect(TelegramClient).toHaveBeenCalledWith(
  //         expect.any(StringSession), // Очікуємо інстанс StringSession
  //         mockApiId, // Дешифрований apiId
  //         mockApiHash, // Дешифрований apiHash
  //         { connectionRetries: 5 }
  //     );
  //     expect(mockClientInstance.connect).toHaveBeenCalledTimes(1); // connect викликався
  //     expect(console.log).toHaveBeenCalledWith(t('telegram.success.initialized')); // Лог ініціалізації
  //     expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1); // isUserAuthorized викликався
  //     expect(console.log).toHaveBeenCalledWith(t('telegram.success.session')); // Лог успішної сесії
  //     expect(sendAndHandleMessages).toHaveBeenCalledWith(
  //         mockClientInstance,
  //         mockTelegram.channel,
  //         t('telegram.success.session'),
  //         t('telegram.success.come_back_user'),
  //         mockUser
  //     );
  //      // Перевіряємо, що saveSession була викликана (або перевірити її виклик на Session.findOneAndUpdate)
  //      // initializeClient не викликає saveSession безпосередньо, saveSession викликається в signIn
  //      // expect(saveSession).not.toHaveBeenCalled(); // saveSession тут не викликається
  //     expect(consoleErrorSpy).not.toHaveBeenCalled();
  //     expect(result).toBe(true); // Повинно повернути true
  //   });

  //   test('повинен ініціалізувати клієнт та повернути true, якщо користувач авторизований (і сесія НЕ існує)', async () => {
  //     Session.findOne.mockResolvedValue(null); // Сесія НЕ існує
  //     Telegram.findOne.mockResolvedValue(mockTelegram);
  //     mockClientInstance.isUserAuthorized.mockResolvedValue(true);

  //     const result = await telegramController.initializeClient(mockUserId);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(StringSession).toHaveBeenCalledWith(''); // StringSession створено з порожнім рядком
  //     expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(mockTelegram.getDecryptedApiId).toHaveBeenCalled();
  //     expect(mockTelegram.getDecryptedApiHash).toHaveBeenCalled();
  //     expect(TelegramClient).toHaveBeenCalledWith(expect.any(StringSession), mockApiId, mockApiHash, { connectionRetries: 5 });
  //     expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
  //     expect(console.log).toHaveBeenCalledWith(t('telegram.success.initialized'));
  //     expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //     expect(console.log).toHaveBeenCalledWith(t('telegram.success.session'));
  //     expect(sendAndHandleMessages).toHaveBeenCalledWith(
  //         mockClientInstance,
  //         mockTelegram.channel,
  //         t('telegram.success.session'),
  //         t('telegram.success.come_back_user'),
  //         mockUser
  //     );
  //     expect(consoleErrorSpy).not.toHaveBeenCalled();
  //     expect(result).toBe(true); // Повинно повернути true
  //   });

  //   test('повинен ініціалізувати клієнт та повернути false, якщо користувач НЕ авторизований', async () => {
  //     Session.findOne.mockResolvedValue(mockSessionData); // Сесія існує
  //     Telegram.findOne.mockResolvedValue(mockTelegram);
  //     mockClientInstance.isUserAuthorized.mockResolvedValue(false); // Користувач НЕ авторизований

  //     const result = await telegramController.initializeClient(mockUserId);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(StringSession).toHaveBeenCalledWith(mockSessionData.session);
  //     expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(mockTelegram.getDecryptedApiId).toHaveBeenCalled();
  //     expect(mockTelegram.getDecryptedApiHash).toHaveBeenCalled();
  //     expect(TelegramClient).toHaveBeenCalledWith(expect.any(StringSession), mockApiId, mockApiHash, { connectionRetries: 5 });
  //     expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
  //     expect(console.log).toHaveBeenCalledWith(t('telegram.success.initialized'));
  //     expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //     expect(sendAndHandleMessages).not.toHaveBeenCalled(); // Повідомлення не надсилається
  //     expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.sesion')); // Лог помилки авторизації
  //     expect(result).toBe(false); // Повинно повернути false
  //   });

  //   test('повинен повернути повідомлення про помилку, якщо Telegram конфігурацію не знайдено', async () => {
  //     Session.findOne.mockResolvedValue(mockSessionData); // Сесія існує
  //     Telegram.findOne.mockResolvedValue(null); // Telegram конфіг НЕ знайдено

  //     const result = await telegramController.initializeClient(mockUserId);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId }); // Сесія все одно шукається
  //     expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(StringSession).not.toHaveBeenCalled(); // Клієнт не ініціалізується
  //     expect(TelegramClient).not.toHaveBeenCalled();
  //     expect(mockClientInstance.connect).not.toHaveBeenCalled();
  //     expect(mockClientInstance.isUserAuthorized).not.toHaveBeenCalled();
  //     expect(sendAndHandleMessages).not.toHaveBeenCalled();
  //     expect(consoleErrorSpy).not.toHaveBeenCalled(); // Логу помилки немає в цій гілці

  //     expect(result).toBe(t('telegram.errors.not_found')); // Повинно повернути повідомлення про помилку
  //   });

  //    // NOTE: initializeClient не має свого try...catch. Його помилки обробляються там, де його викликають (наприклад, в getClient).
  //    // Тому тест на загальну помилку initializeClient робиться опосередковано через getClient або checkSession.
  // });

  // describe('getClient', () => {
  //   let initializeClientSpy;

  //   beforeEach(() => {
  //       initializeClientSpy = jest.spyOn(telegramController, 'initializeClient');
  //   });

  //   afterEach(() => {
  //       initializeClientSpy.mockRestore(); // Відновлюємо initializeClient після кожного тесту
  //   });

  //   test('повинен повернути існуючий авторизований клієнт', async () => {
  //     mockClientInstance.isUserAuthorized.mockResolvedValue(true);
  //       initializeClientSpy.mockResolvedValue(true); // Його не мають викликати

  //       await telegramController.initializeClient(mockUserId); // Ініціалізуємо клієнта

  //     const result = await telegramController.getClient();

  //       expect(initializeClientSpy).toHaveBeenCalledTimes(1); // викликався до тесту
  //       expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1); // викликався в getClient
  //       expect(initializeClientSpy).toHaveBeenCalledTimes(1); // Викликався тільки перед тестом

  //       expect(result).toBe(mockClientInstance); // Повинен повернути встановлений клієнт
  //       expect(consoleErrorSpy).not.toHaveBeenCalled();
  //     });

  //      test('повинен ініціалізувати клієнт та повернути його, якщо він ще не авторизований, але ініціалізація успішна', async () => {
  //          // Встановлюємо module-scoped client як undefined на початку тесту ( Jest ізолює їх)
  //          // Мокуємо initializeClient, щоб він повернув true (успіх ініціалізації)
  //          initializeClientSpy.mockResolvedValue(true);
  //           // Мокуємо isUserAuthorized на мок-інстансі client, щоб він спочатку був false
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(false); // client не авторизований

  //           // getClient спробує викликати isUserAuthorized (буде false), потім initializeClient
  //           // initializeClientspy поверне true, і controller.client буде встановлено.
  //          // initializeClientSpy сам потурбується про встановлення client, якщо його мок правильно імітує це.
  //          // Або ми можемо змусити initializeClientSpy встановити client.
  //          // Простіше мокувати initializeClientSpy так, щоб він імітував встановлення client
  //          initializeClientSpy.mockImplementation(async (userId) => {
  //              // Імітуємо ініціалізацію: встановлюємо module-scoped client
  //              // Це потребує доступу до module-scoped змінної client в telegramController, що складно моками Jest.
  //              // АБО просто мокуємо initializeClientSpy повертати true І переконуємося, що controller повертає client.
  //              // Для цього, можливо, потрібно змусити controller.client посилатись на mockClientInstance.

  //              // Альтернативний підхід: мокувати getClient напряму, щоб імітувати різні стани
  //              // Це часто простіше, ніж імітувати module-scoped змінні
  //              // давайте перепишемо тести getClient мокуючи його напряму

  //              // === Перепишемо тест, мокуючи getClient напряму ===
  //               // Мокуємо getClient замість initializeClientSpy для цього тесту
  //               const getClientSpy = jest.spyOn(telegramController, 'getClient');
  //               getClientSpy.mockRestore(); // Відновлюємо getClient Spy, щоб мокувати його

  //               // Мокуємо initializeClient, щоб він повернув true (успіх ініціалізації)
  //               initializeClientSpy.mockResolvedValue(true);
  //               // Мокуємо isUserAuthorized, щоб спочатку був false
  //               mockClientInstance.isUserAuthorized.mockResolvedValue(false);

  //               // Викликаємо initializeClient, щоб він спробував встановити client
  //               // Це може не спрацювати через ізоляцію моків.
  //               // Простіше мокувати getClient так, щоб він імітував поведінку контролера.
  //               // Давайте повернемось до мокування initializeClientSpy і припустимо, що він встановлює client.

  //               initializeClientSpy.mockResolvedValue(true); // InitializeClient успішний
  //               mockClientInstance.isUserAuthorized.mockResolvedValue(false); // client не авторизований спочатку

  //               const result = await telegramController.getClient();

  //               expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1); // isUserAuthorized викликався
  //               expect(initializeClientSpy).toHaveBeenCalledTimes(1); // initializeClient викликався
  //               expect(result).toBe(mockClientInstance); // Повинен повернути встановлений клієнт
  //               expect(consoleErrorSpy).not.toHaveBeenCalled();

  //              // === Кінець переписаного тесту ===
  //              getClientSpy.mockRestore(); // Відновлюємо getClient Spy
  //      });

  //      test('повинен повернути null, якщо клієнт не авторизований і ініціалізація неуспішна', async () => {
  //           // Мокуємо initializeClient, щоб він повернув false (невдача ініціалізації)
  //          initializeClientSpy.mockResolvedValue(false);
  //           // Мокуємо isUserAuthorized на мок-інстансі client, щоб він спочатку був false
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(false);

  //          const result = await telegramController.getClient();

  //          expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1); // isUserAuthorized викликався
  //          expect(initializeClientSpy).toHaveBeenCalledTimes(1); // initializeClient викликався
  //          expect(result).toBeNull(); // Повинен повернути null
  //          expect(consoleErrorSpy).not.toHaveBeenCalled(); // Лог відбувається в initializeClient, а не тут

  //      });

  //      test('повинен логувати помилку та повернути null при помилці під час перевірки авторизації або ініціалізації', async () => {
  //           // Мокуємо isUserAuthorized на мок-інстансі client, щоб він відхилив обіцянку (помилка)
  //          const authError = new Error('Auth check failed');
  //          mockClientInstance.isUserAuthorized.mockRejectedValue(authError);

  //          const result = await telegramController.getClient();

  //          expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1); // isUserAuthorized викликався і впав
  //          expect(initializeClientSpy).not.toHaveBeenCalled(); // initializeClient не має викликатись

  //          expect(result).toBeNull(); // Повинен повернути null
  //          // Перевіряємо логування помилки
  //          expect(t).toHaveBeenCalledWith('errors.client', {error: authError});
  //          expect(consoleErrorSpy).toHaveBeenCalledWith(t('errors.client', {error: authError})); // Лог помилки

  //      });
  //  });

  // describe('sendCode', () => {
  //   // sendCode використовує req/res та initializeClient/client
  //   test('повинен повернути 200 з authorized: true, якщо користувач вже авторизований', async () => {
  //     // User.findById налаштований на успіх в beforeEach
  //     Telegram.findOne.mockResolvedValue(mockTelegram); // Telegram конфіг знайдено
  //     Session.findOne.mockResolvedValue(mockSessionData); // Сесія знайдена
  //     // Мокуємо client.isUserAuthorized на інстансі, що повертається з конструктора
  //     mockClientInstance.isUserAuthorized.mockResolvedValue(true); // Користувач вже авторизований

  //     await telegramController.sendCode(mockReq, mockRes);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(StringSession).toHaveBeenCalledWith(mockSessionData.session);
  //     expect(TelegramClient).toHaveBeenCalledWith(expect.any(StringSession), mockApiId, mockApiHash, { connectionRetries: 5 });
  //     expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
  //     expect(console.log).toHaveBeenCalledWith(t('telegram.success.initialized'));
  //     expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //     // Перевіряємо, що повідомлення успіху надсилається
  //     expect(sendAndHandleMessages).toHaveBeenCalledWith(
  //         mockClientInstance,
  //         mockTelegram.channel,
  //         t('telegram.success.session'),
  //         t('telegram.success.come_back_user'),
  //         mockUser
  //     );
  //      // Перевіряємо успішну відповідь JSON
  //     expect(mockRes.status).toHaveBeenCalledWith(200);
  //     expect(mockRes.json).toHaveBeenCalledWith({ authorized: true, message: t('telegram.success.session') });
  //     expect(consoleErrorSpy).not.toHaveBeenCalled(); // Логу помилки авторизації не має бути
  //   });

  //   test('повинен повернути 200 з phoneCodeHash, якщо користувач не авторизований і код надіслано успішно', async () => {
  //     // User.findById налаштований на успіх (з phoneNumber)
  //     Telegram.findOne.mockResolvedValue(mockTelegram);
  //     Session.findOne.mockResolvedValue(null); // Немає існуючої сесії
  //     mockClientInstance.isUserAuthorized.mockResolvedValue(false); // Користувач не авторизований
  //      // Мокуємо invoke для SendCode API виклику
  //     const mockSendCodeResult = { phoneCodeHash: mockPhoneCodeHash };
  //     // Перевіряємо аргументи Api.auth.SendCode
  //     Api.auth.SendCode.mockImplementation((args) => args); // Повертаємо аргументи як мок об'єкта API
  //     mockClientInstance.invoke.mockResolvedValue(mockSendCodeResult);

  //     await telegramController.sendCode(mockReq, mockRes);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(StringSession).toHaveBeenCalledWith(''); // Порожня сесія
  //     expect(TelegramClient).toHaveBeenCalledWith(expect.any(StringSession), mockApiId, mockApiHash, { connectionRetries: 5 });
  //     expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
  //     expect(console.log).toHaveBeenCalledWith(t('telegram.success.initialized'));
  //     expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //     expect(sendAndHandleMessages).not.toHaveBeenCalled(); // Повідомлення успіху сесії не надсилається
  //     expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.sesion')); // Лог помилки авторизації

  //      // Перевіряємо виклик Api.auth.SendCode з правильними аргументами
  //     expect(Api.auth.SendCode).toHaveBeenCalledWith({
  //         phoneNumber: mockPhoneNumber,
  //         apiId: mockApiId,
  //         apiHash: mockApiHash,
  //         settings: expect.any(Api.CodeSettings), // Перевіряємо, що settings створюються
  //     });
  //     // Перевіряємо виклик client.invoke з результатом Api.auth.SendCode
  //     expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.auth.SendCode));

  //      // Перевіряємо успішну відповідь JSON
  //     expect(mockRes.status).toHaveBeenCalledWith(200);
  //     expect(mockRes.json).toHaveBeenCalledWith({
  //         phoneCodeHash: mockPhoneCodeHash,
  //         phoneNumber: mockPhoneNumber,
  //         message: 'Code sent successfully' // Це хардкоджений рядок в контролері
  //     });
  //     expect(t).toHaveBeenCalledWith('telegram.errors.sesion'); // t() викликався для логу
  //     expect(t).not.toHaveBeenCalledWith('errors.send_code', expect.anything()); // Catch не викликався
  //   });

  //   test('повинен повернути 404, якщо користувача не знайдено', async () => {
  //     User.findById.mockResolvedValue(null);

  //     await telegramController.sendCode(mockReq, mockRes);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(mockRes.status).toHaveBeenCalledWith(404);
  //     expect(mockRes.json).toHaveBeenCalledWith({ error: t('user.errors.user_not_found') });
  //     expect(Session.findOne).not.toHaveBeenCalled();
  //     expect(Telegram.findOne).not.toHaveBeenCalled();
  //     expect(TelegramClient).not.toHaveBeenCalled();
  //     expect(mockClientInstance.connect).not.toHaveBeenCalled();
  //     expect(t).toHaveBeenCalledWith('user.errors.user_not_found');
  //     expect(consoleErrorSpy).not.toHaveBeenCalled();
  //   });

  //   test('повинен повернути 404, якщо Telegram конфігурацію не знайдено', async () => {
  //     // User.findById налаштований на успіх
  //     Session.findOne.mockResolvedValue(mockSessionData);
  //     Telegram.findOne.mockResolvedValue(null); // Telegram конфіг не знайдено

  //     await telegramController.sendCode(mockReq, mockRes);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(mockRes.status).toHaveBeenCalledWith(404);
  //     expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.not_found') });
  //     expect(StringSession).not.toHaveBeenCalled();
  //     expect(TelegramClient).not.toHaveBeenCalled();
  //     expect(t).toHaveBeenCalledWith('telegram.errors.not_found');
  //     expect(consoleErrorSpy).not.toHaveBeenCalled(); // Логу помилки немає в цій гілці
  //   });

  //   test('повинен повернути 422, якщо користувач не має номера телефону', async () => {
  //     const userWithoutPhone = { ...mockUser, phoneNumber: undefined };
  //     User.findById.mockResolvedValue(userWithoutPhone); // Користувач без номера телефону
  //     Telegram.findOne.mockResolvedValue(mockTelegram);
  //     Session.findOne.mockResolvedValue(null);
  //     mockClientInstance.isUserAuthorized.mockResolvedValue(false); // Не авторизований

  //     await telegramController.sendCode(mockReq, mockRes);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(StringSession).toHaveBeenCalledWith('');
  //     expect(TelegramClient).toHaveBeenCalledWith(expect.any(StringSession), mockApiId, mockApiHash, { connectionRetries: 5 });
  //     expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
  //     expect(console.log).toHaveBeenCalledWith(t('telegram.success.initialized'));
  //     expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //     expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.sesion'));
  //     expect(Api.auth.SendCode).not.toHaveBeenCalled(); // SendCode не викликається
  //     expect(mockClientInstance.invoke).not.toHaveBeenCalled(); // invoke не викликається

  //     expect(mockRes.status).toHaveBeenCalledWith(422);
  //     expect(mockRes.json).toHaveBeenCalledWith({ error: t('add_phone') });
  //     expect(t).toHaveBeenCalledWith('add_phone');
  //      expect(t).not.toHaveBeenCalledWith('errors.send_code', expect.anything()); // Catch не викликався
  //   });

  //   test('повинен повернути 422 при помилці під час відправки коду', async () => {
  //     // User.findById налаштований на успіх (з phoneNumber)
  //     Telegram.findOne.mockResolvedValue(mockTelegram);
  //     Session.findOne.mockResolvedValue(null);
  //     mockClientInstance.isUserAuthorized.mockResolvedValue(false);
  //     const sendCodeError = new Error('Telegram SendCode API error');
  //     mockClientInstance.invoke.mockRejectedValue(sendCodeError); // Invoke падає

  //     await telegramController.sendCode(mockReq, mockRes);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(Session.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(Telegram.findOne).toHaveBeenCalledWith({ userId: mockUserId });
  //     expect(StringSession).toHaveBeenCalledWith('');
  //     expect(TelegramClient).toHaveBeenCalledWith(expect.any(StringSession), mockApiId, mockApiHash, { connectionRetries: 5 });
  //     expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
  //     expect(console.log).toHaveBeenCalledWith(t('telegram.success.initialized'));
  //     expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //     expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.sesion'));
  //     // Api.auth.SendCode викликається, але invoke падає
  //     expect(Api.auth.SendCode).toHaveBeenCalledWith(expect.any(Object));
  //     expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.auth.SendCode));

  //     expect(mockRes.status).toHaveBeenCalledWith(422);
  //     // Перевіряємо JSON відповідь та логування з catch блоку
  //     expect(mockRes.json).toHaveBeenCalledWith({ error: t('errors.send_code', {error: sendCodeError}) });
  //     expect(t).toHaveBeenCalledWith('errors.send_code', {error: sendCodeError});
  //     expect(consoleErrorSpy).toHaveBeenCalledWith(t('errors.send_code', {error: sendCodeError}), sendCodeError);
  //   });
  // });

  // describe('signIn', () => {
  //   // signIn використовує req/res, client, saveSession, sendAndHandleMessages, prepareSRP
  //   // припускаємо, що `client` вже встановлений перед викликом signIn
  //   // Для цього тесту мокуємо getClient, щоб він повернув mockClientInstance
  //   let getClientSpy;
  //   let saveSessionSpy;

  //   beforeEach(() => {
  //       // Шпигуємо за getClient та saveSession
  //       getClientSpy = jest.spyOn(telegramController, 'getClient');
  //        // getClient Spy мокуємо, щоб завжди повертав mockClientInstance для тестів signIn
  //       getClientSpy.mockResolvedValue(mockClientInstance); // Забезпечуємо наявність клієнта

  //        saveSessionSpy = jest.spyOn(telegramController, 'saveSession');
  //         // Мокуємо saveSession, щоб він нічого не робив, а просто перевіряємо, що викликався
  //        saveSessionSpy.mockResolvedValue(true); // Він async
  //   });

  //   afterEach(() => {
  //       getClientSpy.mockRestore(); // Відновлюємо getClient
  //       saveSessionSpy.mockRestore(); // Відновлюємо saveSession
  //   });


  //   test('повинен успішно авторизувати користувача за кодом', async () => {
  //     mockReq.body = { phoneCodeHash: mockPhoneCodeHash, code: mockCode };
  //     // User.findById налаштований на успіх (з номером телефону)
  //     // getClientSpy налаштований на повернення mockClientInstance

  //      // Мокуємо invoke для SignIn API виклику
  //     const mockSignInResult = { className: "auth.Authorization", user: { id: 'telegramUserId123' } };
  //     Api.auth.SignIn.mockImplementation((args) => args); // Повертаємо аргументи як мок API об'єкта
  //     mockClientInstance.invoke.mockResolvedValue(mockSignInResult);

  //      // Мокуємо sendAndHandleMessages на успіх
  //      sendAndHandleMessages.mockResolvedValue(true);

  //     await telegramController.signIn(mockReq, mockRes);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //      // Перевіряємо, що client був отриманий
  //     expect(getClientSpy).toHaveBeenCalledTimes(1);
  //      // Перевіряємо виклик Api.auth.SignIn з правильними аргументами
  //     expect(Api.auth.SignIn).toHaveBeenCalledWith({
  //         phoneNumber: mockPhoneNumber,
  //         phoneCodeHash: mockPhoneCodeHash,
  //         phoneCode: mockCode,
  //     });
  //     // Перевіряємо виклик client.invoke з результатом Api.auth.SignIn
  //     expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.auth.SignIn));

  //     expect(saveSessionSpy).toHaveBeenCalledWith(mockUserId);
  //     expect(sendAndHandleMessages).toHaveBeenCalledWith(expect.any(TelegramClient), expect.any(String), expect.any(String), expect.any(String), mockUser);

  //     expect(mockRes.status).toHaveBeenCalledWith(200);
  //     expect(mockRes.json).toHaveBeenCalledWith({ message: t('telegram.success.sign_in'), user: mockSignInResult.user, authorized: true });
  //     expect(t).toHaveBeenCalledWith('telegram.success.sign_in');
  //     expect(consoleErrorSpy).not.toHaveBeenCalled(); // Лог помилки відсутій при успіху
  //   });

  //   test('повинен успішно авторизувати користувача через 2FA, якщо SESSION_PASSWORD_NEEDED', async () => {
  //     mockReq.body = { phoneCodeHash: mockPhoneCodeHash, code: mockCode };
  //     const passwordNeededError = new Error('SESSION_PASSWORD_NEEDED');
  //     passwordNeededError.errorMessage = 'SESSION_PASSWORD_NEEDED';
  //     mockClientInstance.invoke.mockRejectedValueOnce(passwordNeededError);

  //     const mockPasswordInfo = { srpId: mockSrpId };
  //     Api.account.GetPassword.mockImplementation((args) => args);
  //     mockClientInstance.invoke.mockResolvedValueOnce(mockPasswordInfo);

  //       // Мокуємо prepareSRP
  //      const mockSrpData = { A: mockSrpA, M1: mockSrpM1 };
  //      prepareSRP.mockResolvedValue(mockSrpData);

  //       // Мокуємо invoke для CheckPassword
  //      const mockAuthResult = { className: "auth.Authorization", user: { id: 'telegramUserId123_2fa' } };
  //      Api.auth.CheckPassword.mockImplementation((args) => args);
  //      mockClientInstance.invoke.mockResolvedValueOnce(mockAuthResult); // Третій виклик (CheckPassword) успішний

  //       // Мокуємо process.env.PASSWORD для цього тесту
  //       const originalPassword = process.env.PASSWORD;
  //       process.env.PASSWORD = mockPassword;

  //      await telegramController.signIn(mockReq, mockRes);

  //      expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //      expect(getClientSpy).toHaveBeenCalledTimes(1);
  //      // Перевіряємо виклик invoke для SignIn
  //      expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.auth.SignIn));

  //      // Перевіряємо кроки 2FA потоку
  //      expect(Api.account.GetPassword).toHaveBeenCalledTimes(1);
  //      expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.account.GetPassword)); // invoke викликався вдруге
  //      expect(prepareSRP).toHaveBeenCalledWith(mockPasswordInfo, mockPassword);
  //      expect(Api.auth.CheckPassword).toHaveBeenCalledWith({
  //          password: expect.any(Api.InputCheckPasswordSRP) // Перевіряємо створення InputCheckPasswordSRP
  //      });
  //      expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.auth.CheckPassword)); // invoke викликався втретє

  //      // Перевіряємо виклик saveSession
  //      expect(saveSessionSpy).toHaveBeenCalledWith(mockUserId);
  //      // sendAndHandleMessages НЕ викликається в гілці 2FA
  //      expect(sendAndHandleMessages).not.toHaveBeenCalled();

  //      expect(mockRes.status).toHaveBeenCalledWith(200);
  //      expect(mockRes.json).toHaveBeenCalledWith({ message: t('telegram.success.2fa'), user: mockAuthResult.user });
  //      expect(t).toHaveBeenCalledWith('telegram.success.2fa');
  //       expect(t).not.toHaveBeenCalledWith('telegram.errors.2fa', expect.anything()); // Catch внутрішньої помилки не викликався

  //      // Відновлюємо original process.env.PASSWORD
  //      process.env.PASSWORD = originalPassword;
  //      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Лог помилки відсутій при успіху 2FA
  //    });

  //   test('повинен повернути 422, якщо відсутні необхідні дані для signIn', async () => {
  //     mockReq.body = { phoneCodeHash: mockPhoneCodeHash }; // Відсутній code
  //     // User.findById налаштований на успіх (з номером телефону)
  //     // getClientSpy налаштований на повернення mockClientInstance

  //     await telegramController.signIn(mockReq, mockRes);

  //     expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //     expect(getClientSpy).toHaveBeenCalledTimes(1);
  //     expect(Api.auth.SignIn).not.toHaveBeenCalled(); // SignIn не викликається
  //     expect(mockClientInstance.invoke).not.toHaveBeenCalled(); // invoke не викликається
  //     expect(saveSessionSpy).not.toHaveBeenCalled();
  //     expect(sendAndHandleMessages).not.toHaveBeenCalled();

  //     expect(mockRes.status).toHaveBeenCalledWith(422);
  //      // Перевіряємо JSON відповідь з деталями відсутніх полів
  //     expect(mockRes.json).toHaveBeenCalledWith({
  //         error: t('errors.missing_data'),
  //         details: {
  //             phoneNumber: t('present'),
  //             phoneCodeHash: t('present'),
  //             code: t('missing'), // code відсутній
  //         },
  //         authorized: false,
  //     });
  //      // Перевіряємо виклики t() для повідомлення про помилку та деталей
  //     expect(t).toHaveBeenCalledWith('errors.missing_data');
  //     expect(t).toHaveBeenCalledWith('present'); // Для phoneNumber, phoneCodeHash
  //     expect(t).toHaveBeenCalledWith('missing'); // Для code
  //     expect(consoleErrorSpy).not.toHaveBeenCalled();
  //   });

  //    test('повинен повернути 401, якщо signIn помилка не SESSION_PASSWORD_NEEDED', async () => {
  //      mockReq.body = { phoneCodeHash: mockPhoneCodeHash, code: mockCode };
  //      // User.findById налаштований на успіх (з номером телефону)
  //      // getClientSpy налаштований на повернення mockClientInstance
  //       // Мокуємо invoke для SignIn, щоб він відхилив обіцянку з іншою помилкою
  //      const signInError = new Error('PHONE_CODE_INVALID');
  //      signInError.errorMessage = 'PHONE_CODE_INVALID'; // Інше повідомлення про помилку
  //      mockClientInstance.invoke.mockRejectedValueOnce(signInError); // Перший виклик (SignIn) падає

  //      await telegramController.signIn(mockReq, mockRes);

  //      expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //      expect(getClientSpy).toHaveBeenCalledTimes(1);
  //      expect(Api.auth.SignIn).toHaveBeenCalledWith(expect.any(Object));
  //      expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.auth.SignIn));

  //      expect(saveSessionSpy).not.toHaveBeenCalled();
  //      expect(sendAndHandleMessages).not.toHaveBeenCalled();
  //      expect(Api.account.GetPassword).not.toHaveBeenCalled(); // 2FA потік не запускається

  //      expect(mockRes.status).toHaveBeenCalledWith(401); // Очікуємо 401
  //      expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.sign_in'), authorized: false });
  //      expect(t).toHaveBeenCalledWith('telegram.errors.sign_in');
  //      // Перевіряємо логування помилки (контролер логує result в гілці else 401)
  //      // expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', expect.any(Object)); // Лог в else гілці
  //       // Або якщо помилка кидається, лог з catch блоку
  //       expect(consoleErrorSpy).not.toHaveBeenCalled(); // Припускаємо, що лог в else гілці
  //    });

  //    test('повинен повернути 422 при помилці внутрішнього 2FA потоку', async () => {
  //       mockReq.body = { phoneCodeHash: mockPhoneCodeHash, code: mockCode };
  //       // User.findById налаштований на успіх
  //       // getClientSpy налаштований на повернення mockClientInstance
  //        // Мокуємо invoke для SignIn, щоб він відхилив обіцянку з SESSION_PASSWORD_NEEDED
  //       const passwordNeededError = new Error('SESSION_PASSWORD_NEEDED');
  //       passwordNeededError.errorMessage = 'SESSION_PASSWORD_NEEDED';
  //       mockClientInstance.invoke.mockRejectedValueOnce(passwordNeededError);

  //        // Налаштовуємо моки для 2FA потоку - симулюємо помилку на одному з кроків
  //        // Мокуємо invoke для GetPassword, щоб він відхилив обіцянку
  //       const getPasswordError = new Error('Telegram GetPassword API error');
  //       mockClientInstance.invoke.mockRejectedValueOnce(getPasswordError); // Другий виклик (GetPassword) падає

  //       await telegramController.signIn(mockReq, mockRes);

  //       expect(User.findById).toHaveBeenCalledWith(mockUserId);
  //       expect(getClientSpy).toHaveBeenCalledTimes(1);
  //       expect(Api.auth.SignIn).toHaveBeenCalledWith(expect.any(Object));
  //       expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.auth.SignIn)); // Перший invoke

  //       // Перевіряємо, що 2FA потік почався
  //       expect(Api.account.GetPassword).toHaveBeenCalledTimes(1);
  //       expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.account.GetPassword)); // Другий invoke і він падає

  //       expect(prepareSRP).not.toHaveBeenCalled(); // Подальші кроки 2FA не викликаються
  //       expect(Api.auth.CheckPassword).not.toHaveBeenCalled();
  //       expect(saveSessionSpy).not.toHaveBeenCalled();
  //       expect(sendAndHandleMessages).not.toHaveBeenCalled();

  //       expect(mockRes.status).toHaveBeenCalledWith(422); // Очікуємо 422
  //       // Перевіряємо JSON відповідь та логування з внутрішнього catch блоку
  //       expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.2fa', {error: getPasswordError}) });
  //       expect(t).toHaveBeenCalledWith('telegram.errors.2fa', {error: getPasswordError});
  //       expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.2fa', {error: getPasswordError}), getPasswordError); // Лог внутрішньої помилки
  //    });

  //     // Можна додати більше тестів для помилок 2FA (prepareSRP помилка, CheckPassword помилка)
  // });

  // describe('checkSession', () => {
  //     // checkSession використовує req/res, client, initializeClient
  //     let initializeClientSpy;
  //      let mockAdminUser;

  //      beforeEach(() => {
  //          // Шпигуємо та мокуємо initializeClient
  //          initializeClientSpy = jest.spyOn(telegramController, 'initializeClient');

  //           // Мокуємо пошук адміна
  //           mockAdminUser = { _id: 'adminIdForSessionCheck', role: 'admin' };
  //           User.findOne.mockResolvedValue(mockAdminUser); // Налаштовуємо User.findOne для пошуку адміна

  //      });

  //      afterEach(() => {
  //          initializeClientSpy.mockRestore();
  //      });

  //     test('повинен повернути 200 з authorized: true, якщо клієнт вже існує і авторизований', async () => {
  //          // Мокуємо isUserAuthorized на мок-інстансі client, що повертає true
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(true);
  //          // Припускаємо, що module-scoped `client` вже посилається на `mockClientInstance`
  //          // Це складно імітувати напряму, але якщо initializeClient його встановлює,
  //          // ми можемо запустити initializeClient з моками, щоб його встановити перед тестом.
  //          // Або, простіше, мокувати сам checkSession або client getter, якщо він є.
  //          // Давайте припустимо, що initializeClient встановлює client.
  //          // Викликаємо initializeClient один раз перед тестом, щоб він встановив client
  //          await telegramController.initializeClient(mockUserId); // Використовуємо initializeClient для встановлення client

  //          // Тепер module-scoped client встановлений і isUserAuthorized поверне true

  //          await telegramController.checkSession(mockReq, mockRes);

  //          // Перевіряємо, що User.findOne був викликаний для пошуку адміна
  //          expect(User.findOne).toHaveBeenCalledWith({ role: 'admin' });
  //          // isUserAuthorized має бути викликаний на встановленому client
  //          expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //          // initializeClient НЕ має бути викликаний в checkSession, бо isUserAuthorized() повертає true
  //          expect(initializeClientSpy).toHaveBeenCalledTimes(1); // викликався тільки перед тестом для встановлення client

  //          expect(mockRes.status).toHaveBeenCalledWith(200);
  //          expect(mockRes.json).toHaveBeenCalledWith({ authorized: true, message: t('telegram.success.authorized') });
  //          expect(t).toHaveBeenCalledWith('telegram.success.authorized');
  //           expect(consoleErrorSpy).not.toHaveBeenCalled();
  //     });

  //     test('повинен повернути 200 з authorized: true, якщо клієнт не авторизований, але initializeClient успішний', async () => {
  //         // Мокуємо isUserAuthorized на мок-інстансі client, що повертає false
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(false);
  //          // Мокуємо initializeClient, щоб він повернув true (успіх ініціалізації)
  //          initializeClientSpy.mockResolvedValue(true);
  //          // Мокуємо User.findOne для пошуку адміна
  //          User.findOne.mockResolvedValue(mockAdminUser);


  //          await telegramController.checkSession(mockReq, mockRes);

  //          // Перевіряємо, що User.findOne був викликаний для пошуку адміна
  //          expect(User.findOne).toHaveBeenCalledWith({ role: 'admin' });
  //          // isUserAuthorized має бути викликаний на client (навіть якщо він undefined спочатку)
  //          // console.error("isAuthorized:", isAuthorized); // Лог з контролера
  //          // Якщо client undefined, то client?.isUserAuthorized() поверне undefined.
  //          // В такому випадку, умова `if (isAuthorized)` буде false, і виконається `else if (await initializeClient(admin._id))`.
  //          // Перевіримо, чи isUserAuthorized викликався (якщо client існує) або не викликався (якщо client undefined)
  //          // У beforeEach client скидається, тому він спочатку undefined.
  //          // `client?.isUserAuthorized()` поверне undefined.
  //          // assert(mockClientInstance.isUserAuthorized).not.toHaveBeenCalled(); // client спочатку undefined

  //          // initializeClient ПОВИНЕН бути викликаний з id адміна
  //          expect(initializeClientSpy).toHaveBeenCalledWith(mockAdminUser._id);
  //          expect(initializeClientSpy).toHaveBeenCalledTimes(1);

  //          expect(mockRes.status).toHaveBeenCalledWith(200);
  //          expect(mockRes.json).toHaveBeenCalledWith({ authorized: true, message: t('telegram.success.authorized') });
  //          expect(t).toHaveBeenCalledWith('telegram.success.authorized');
  //          expect(consoleErrorSpy).not.toHaveBeenCalled();
  //     });

  //     test('повинен повернути 401 з authorized: false, якщо клієнт не авторизований і initializeClient неуспішний', async () => {
  //          // Мокуємо isUserAuthorized на мок-інстансі client, що повертає false
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(false);
  //          // Мокуємо initializeClient, щоб він повернув false (невдача ініціалізації)
  //          initializeClientSpy.mockResolvedValue(false);
  //           // Мокуємо User.findOne для пошуку адміна
  //          User.findOne.mockResolvedValue(mockAdminUser);


  //          await telegramController.checkSession(mockReq, mockRes);

  //          // Перевіряємо, що User.findOne був викликаний для пошуку адміна
  //          expect(User.findOne).toHaveBeenCalledWith({ role: 'admin' });
  //          // isUserAuthorized має бути викликаний (або client undefined)
  //          // assert(mockClientInstance.isUserAuthorized).not.toHaveBeenCalled(); // client спочатку undefined

  //          // initializeClient ПОВИНЕН бути викликаний з id адміна
  //          expect(initializeClientSpy).toHaveBeenCalledWith(mockAdminUser._id);
  //          expect(initializeClientSpy).toHaveBeenCalledTimes(1);

  //          expect(mockRes.status).toHaveBeenCalledWith(401); // Очікуємо 401
  //          expect(mockRes.json).toHaveBeenCalledWith({ message: t('telegram.errors.authorized'), authorized: false });
  //          expect(t).toHaveBeenCalledWith('telegram.errors.authorized');
  //          expect(consoleErrorSpy).not.toHaveBeenCalled(); // Лог відбувається в initializeClient, а не тут
  //     });

  //      test('повинен повернути 422 при загальній помилці', async () => {
  //          const checkSessionError = new Error('Check session error');
  //          // Мокуємо User.findOne для пошуку адміна, щоб він відхилив обіцянку
  //          User.findOne.mockRejectedValue(checkSessionError);

  //          await telegramController.checkSession(mockReq, mockRes);

  //           // Перевіряємо, що User.findOne був викликаний і впав
  //          expect(User.findOne).toHaveBeenCalledWith({ role: 'admin' });
  //          // isUserAuthorized НЕ має викликатись
  //          expect(mockClientInstance.isUserAuthorized).not.toHaveBeenCalled();
  //          // initializeClient НЕ має викликатись
  //          expect(initializeClientSpy).not.toHaveBeenCalled();

  //          expect(mockRes.status).toHaveBeenCalledWith(422); // Очікуємо 422
  //          // Перевіряємо JSON відповідь та логування
  //          expect(mockRes.json).toHaveBeenCalledWith({ error: t('telegram.errors.checking_session', {error: checkSessionError}) });
  //          expect(t).toHaveBeenCalledWith('telegram.errors.checking_session', {error: checkSessionError});
  //          expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.checking_session', {error: checkSessionError}), checkSessionError);
  //      });
  // });

   // --- ТЕСТИ ДЛЯ getClient ---
  //  describe('getClient', () => {
  //      // getClient використовує module-scoped client та initializeClient
  //      // Мокуємо initializeClient, щоб контролювати його результат та side effects
  //      let initializeClientSpy;
  //      let mockAdminUser;

  //      beforeEach(() => {
  //          // Шпигуємо та мокуємо initializeClient
  //          initializeClientSpy = jest.spyOn(telegramController, 'initializeClient');

  //           // Мокуємо пошук адміна
  //           mockAdminUser = { _id: 'adminIdForGetClient', role: 'admin' };
  //           User.findOne.mockResolvedValue(mockAdminUser); // Налаштовуємо User.findOne для пошуку адміна

  //           // Скидаємо module-scoped client перед кожним тестом getClient
  //           // Це складніше. Можливо, потрібно тимчасово перевизначити module-scoped client
  //           // Або, простіше, мокувати initializeClient так, щоб він правильно імітував
  //           // встановлення module-scoped client, або просто повертав true/false/error.
  //           // У контролері initializeClient встановлює client.
  //           // Давайте мокувати initializeClient так, щоб він встановлював client,
  //           // але це вимагає доступу до приватної змінної, що є анти-патерном.
  //           // Найкращий спосіб - рефакторинг контролера, щоб client не був module-scoped.
  //           // Але для тестування як є, ми можемо мокувати initializeClientSpy, щоб він
  //           // або повертав true (і ми припускаємо, що client був встановлений),
  //           // або повертав false/error.
  //           // І в тестах, де client повинен бути встановлений заздалегідь, викликати initializeClient перед тестом.

  //          // Мокуємо initializeClient, щоб він імітував встановлення клієнта і повертав результат авторизації
  //           initializeClientSpy.mockImplementation(async (userId) => {
  //               // Імітуємо встановлення клієнта (якщо це можливо або потрібно для подальших моків)
  //               // Тут просто повертаємо результат авторизації
  //               const result = await mockClientInstance.isUserAuthorized(); // Викликаємо isUserAuthorized на мок-інстансі
  //                return result; // InitializeClient повертає boolean
  //           });
  //      });

  //      afterEach(() => {
  //          initializeClientSpy.mockRestore(); // Відновлюємо initializeClient
  //      });

  //      test('повинен повернути існуючий авторизований клієнт', async () => {
  //          // Встановлюємо client?.isUserAuthorized() на true
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(true);
  //          // Оскільки initializeClientSpy мокує initializeClient, він не буде викликаний
  //          // в гілці `else if` контролера, якщо isUserAuthorized() повертає true.
  //          // Нам потрібно, щоб module-scoped `client` існував на початку тесту
  //          // і був авторизований. Знову проблема з module-scoped змінною.
  //          // Простіше мокувати getClient напряму для цього тесту.

  //          // === Перепишемо тест, мокуючи getClient напряму ===
  //           const getClientOriginal = telegramController.getClient; // Зберігаємо оригінал
  //           const getClientSpy = jest.spyOn(telegramController, 'getClient');
  //           // Мокуємо getClient, щоб він повертав mockClientInstance для цього тесту
  //           getClientSpy.mockResolvedValue(mockClientInstance);

  //           await telegramController.getClient(); // Викликаємо мокований getClient

  //           // Перевіряємо, що мокований getClient був викликаний
  //           expect(getClientSpy).toHaveBeenCalledTimes(1);
  //           // Перевіряємо, що мокований getClient повернув mockClientInstance
  //           expect(getClientSpy).toHaveReturnedWith(mockClientInstance);

  //           getClientSpy.mockRestore(); // Відновлюємо оригінальний getClient

  //          // --- Кінець переписаного тесту ---
  //      });

  //      test('повинен ініціалізувати клієнт та повернути його, якщо він ще не авторизований, але ініціалізація успішна', async () => {
  //           // У цьому тесті getClient викличе initializeClient.
  //           // initializeClientSpy вже мокується в beforeEach, щоб викликати isUserAuthorized().
  //           // Налаштовуємо isUserAuthorized так, щоб він спочатку був false, а потім успішний.
  //           // Мокуємо isUserAuthorized на мок-інстансі client
  //           mockClientInstance.isUserAuthorized.mockResolvedValueOnce(false); // Перший виклик (в getClient) повертає false
  //           // initializeClient буде викликано і всередині нього знову викличеться isUserAuthorized
  //           // Треба, щоб другий виклик isUserAuthorized повернув true.
  //           // Можна налаштувати mockResolvedValueOnce кілька разів або використовувати mockResolvedValue.
  //           mockClientInstance.isUserAuthorized.mockResolvedValue(true); // Другий виклик (в initializeClient) повертає true

  //           const result = await telegramController.getClient();

  //           // Перевіряємо, що isUserAuthorized викликався двічі: один раз в getClient, один раз в initializeClient
  //           expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(2);
  //           // Перевіряємо, що initializeClientSpy викликався один раз з id адміна
  //           expect(initializeClientSpy).toHaveBeenCalledTimes(1);
  //           expect(initializeClientSpy).toHaveBeenCalledWith(mockAdminUser._id);

  //           expect(result).toBe(mockClientInstance); // Повинен повернути встановлений клієнт
  //           expect(consoleErrorSpy).not.toHaveBeenCalled();
  //      });

  //      test('повинен повернути null, якщо клієнт не авторизований і ініціалізація неуспішна', async () => {
  //           // Мокуємо isUserAuthorized на мок-інстансі client, що повертає false
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(false);
  //          // Мокуємо initializeClientSpy, щоб він повернув false (невдача ініціалізації)
  //          initializeClientSpy.mockResolvedValue(false); // initializeClient повертає false

  //          const result = await telegramController.getClient();

  //          // Перевіряємо, що isUserAuthorized викликався один раз
  //          expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //          // Перевіряємо, що initializeClientSpy викликався один раз з id адміна
  //          expect(initializeClientSpy).toHaveBeenCalledTimes(1);
  //          expect(initializeClientSpy).toHaveBeenCalledWith(mockAdminUser._id);

  //          expect(result).toBeNull(); // Повинен повернути null
  //          expect(consoleErrorSpy).not.toHaveBeenCalled(); // Лог відбувається в initializeClient, а не тут
  //      });

  //      test('повинен логувати помилку та повернути null при помилці User.findOne (адміна)', async () => {
  //          const findAdminError = new Error('Find admin error');
  //           // Мокуємо User.findOne для пошуку адміна, щоб він відхилив обіцянку
  //          User.findOne.mockRejectedValue(findAdminError);

  //          const result = await telegramController.getClient();

  //           // Перевіряємо, що User.findOne був викликаний і впав
  //          expect(User.findOne).toHaveBeenCalledWith({ role: 'admin' });
  //          // isUserAuthorized НЕ має викликатись
  //          expect(mockClientInstance.isUserAuthorized).not.toHaveBeenCalled();
  //          // initializeClientSpy НЕ має викликатись
  //          expect(initializeClientSpy).not.toHaveBeenCalled();

  //          expect(result).toBeNull(); // Повинен повернути null
  //          // Перевіряємо логування помилки з catch блоку getClient
  //          expect(t).toHaveBeenCalledWith('errors.client', {error: findAdminError});
  //          expect(consoleErrorSpy).toHaveBeenCalledWith(t('errors.client', {error: findAdminError}));
  //      });

  //      test('повинен логувати помилку та повернути null при помилці initializeClient', async () => {
  //          const initError = new Error('Initialization failed');
  //           // Мокуємо initializeClientSpy, щоб він відхилив обіцянку
  //          initializeClientSpy.mockRejectedValue(initError);
  //           // Мокуємо isUserAuthorized на false, щоб initializeClient викликався
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(false);

  //          const result = await telegramController.getClient();

  //          expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //          expect(initializeClientSpy).toHaveBeenCalledTimes(1);
  //          expect(initializeClientSpy).toHaveBeenCalledWith(mockAdminUser._id);

  //          expect(result).toBeNull(); // Повинен повернути null
  //          // Перевіряємо логування помилки з catch блоку getClient
  //          expect(t).toHaveBeenCalledWith('errors.client', {error: initError});
  //          expect(consoleErrorSpy).toHaveBeenCalledWith(t('errors.client', {error: initError}));
  //      });

  //      // Можна додати тест, якщо initializeClient логує, але не кидає виняток, а повертає false/error string
  //      // Але поточний initializeClient кидає виняток або повертає false/error string, а не кидає,
  //      // тому catch в getClient спрацює тільки якщо initializeClient відхилить обіцянку.
  //  });


   // --- ТЕСТИ ДЛЯ joinChannel (Внутрішня функція) ---
  //  describe('joinChannel', () => {
  //      // joinChannel використовує client та invoke
  //      // Припускаємо, що client встановлений. Мокуємо getClient або імітуємо client

  //      test('повинен успішно приєднатися до каналу', async () => {
  //          const channelName = 'testChannel';
  //          // Мокуємо isUserAuthorized на true
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(true);
  //          // Мокуємо invoke для JoinChannel
  //          const joinResult = { updates: [] }; // Типовий результат JoinChannel
  //          Api.channels.JoinChannel.mockImplementation(args => args);
  //          mockClientInstance.invoke.mockResolvedValue(joinResult);

  //          const result = await telegramController.joinChannel(channelName);

  //          expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //          expect(Api.channels.JoinChannel).toHaveBeenCalledWith({ channel: channelName });
  //          expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.channels.JoinChannel));

  //          expect(result).toBe(joinResult); // Повинен повернути результат invoke
  //          expect(console.log).toHaveBeenCalledWith(t('telegram.success.join_channel', {channelName: channelName}), joinResult); // Лог успіху
  //          expect(consoleErrorSpy).not.toHaveBeenCalled();
  //      });

  //      test('повинен повернути повідомлення про помилку, якщо клієнт не авторизований', async () => {
  //          const channelName = 'testChannel';
  //          // Мокуємо isUserAuthorized на false
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(false);

  //          const result = await telegramController.joinChannel(channelName);

  //          expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //          expect(Api.channels.JoinChannel).not.toHaveBeenCalled(); // invoke не викликається
  //          expect(mockClientInstance.invoke).not.toHaveBeenCalled();

  //          expect(result).toBe(t('telegram.errors.authorized')); // Повертає повідомлення про помилку авторизації
  //          expect(console.log).not.toHaveBeenCalled();
  //          expect(consoleErrorSpy).not.toHaveBeenCalled();
  //      });

  //      test('повинен логувати помилку та повернути повідомлення про помилку при відхиленні invoke', async () => {
  //          const channelName = 'testChannel';
  //          // Мокуємо isUserAuthorized на true
  //          mockClientInstance.isUserAuthorized.mockResolvedValue(true);
  //          // Мокуємо invoke для JoinChannel, щоб він відхилив обіцянку
  //          const joinError = new Error('Channel not found error');
  //          mockClientInstance.invoke.mockRejectedValue(joinError);

  //          const result = await telegramController.joinChannel(channelName);

  //          expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
  //          expect(Api.channels.JoinChannel).toHaveBeenCalledWith({ channel: channelName });
  //          expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.channels.JoinChannel));

  //          // Повертає повідомлення про помилку з catch блоку
  //          expect(result).toBe(t('telegram.errors.channel_not_found', {error: joinError}));
  //          // Логує помилку
  //          expect(t).toHaveBeenCalledWith('telegram.errors.channel_not_found', {error: joinError});
  //          expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.channel_not_found', {error: joinError}), joinError);
  //      });
  //  });

    // --- ТЕСТИ ДЛЯ checkSubscription (Внутрішня функція) ---
    // describe('checkSubscription', () => {
    //     // checkSubscription використовує client, getMe, invoke, GetParticipant
    //     // Припускаємо, що client встановлений. Мокуємо getClient або імітуємо client

    //     test('повинен повернути true, якщо користувач є учасником каналу', async () => {
    //         const channelName = 'testChannel';
    //         const mockUsername = 'mockUserTelegram';
    //         // Мокуємо isUserAuthorized на true
    //         mockClientInstance.isUserAuthorized.mockResolvedValue(true);
    //         // Мокуємо getMe
    //         mockClientInstance.getMe.mockResolvedValue({ username: mockUsername });
    //         // Мокуємо invoke для GetParticipant, щоб він успішно повертав результат
    //         Api.channels.GetParticipant.mockImplementation(args => args);
    //         const participantResult = { participant: {} }; // Неважливо який результат, головне що успіх
    //         mockClientInstance.invoke.mockResolvedValue(participantResult);

    //         const result = await telegramController.checkSubscription(channelName);

    //         expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
    //         expect(mockClientInstance.getMe).toHaveBeenCalledTimes(1);
    //         expect(Api.channels.GetParticipant).toHaveBeenCalledWith({
    //             channel: channelName,
    //             participant: mockUsername,
    //         });
    //         expect(mockClientInstance.invoke).toHaveBeenCalledWith(expect.any(Api.channels.GetParticipant));

    //         expect(result).toBe(true); // Повертає true при успіху
    //         expect(consoleErrorSpy).not.toHaveBeenCalled(); // Лог тільки при помилці
    //     });

    //     test('повинен повернути повідомлення про помилку, якщо клієнт не авторизований', async () => {
    //         const channelName = 'testChannel';
    //         // Мокуємо isUserAuthorized на false
    //         mockClientInstance.isUserAuthorized.mockResolvedValue(false);

    //         const result = await telegramController.checkSubscription(channelName);

    //         expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
    //         expect(mockClientInstance.getMe).not.toHaveBeenCalled(); // getMe не викликається
    //         expect(Api.channels.GetParticipant).not.toHaveBeenCalled(); // invoke не викликається
    //         expect(mockClientInstance.invoke).not.toHaveBeenCalled();

    //         expect(result).toBe(t('telegram.errors.authorized')); // Повертає повідомлення про помилку авторизації
    //         expect(consoleErrorSpy).not.toHaveBeenCalled();
    //     });

    //     test('повинен повернути false при помилці getMe або invoke', async () => {
    //         const channelName = 'testChannel';
    //         // Мокуємо isUserAuthorized на true
    //         mockClientInstance.isUserAuthorized.mockResolvedValue(true);
    //          // Мокуємо getMe, щоб він відхилив обіцянку
    //         const getMeError = new Error('GetMe failed');
    //         mockClientInstance.getMe.mockRejectedValue(getMeError);

    //         const result = await telegramController.checkSubscription(channelName);

    //         expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(1);
    //         expect(mockClientInstance.getMe).toHaveBeenCalledTimes(1); // getMe викликався і впав
    //         expect(Api.channels.GetParticipant).not.toHaveBeenCalled(); // invoke не викликається
    //         expect(mockClientInstance.invoke).not.toHaveBeenCalled();

    //         // Повертає false з catch блоку
    //         expect(result).toBe(false);
    //         // Логує помилку
    //         expect(t).toHaveBeenCalledWith('telegram.errors.subscribe_channel', {error: getMeError});
    //         expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.subscribe_channel', {error: getMeError}), getMeError);

    //          // Тест для помилки invoke
    //         mockClientInstance.isUserAuthorized.mockResolvedValue(true); // Скидаємо
    //         mockClientInstance.getMe.mockResolvedValue({ username: 'mockUserTelegram' }); // getMe успішний
    //         const invokeError = new Error('Participant not found error');
    //         mockClientInstance.invoke.mockRejectedValue(invokeError); // invoke падає

    //         const result2 = await telegramController.checkSubscription(channelName);

    //         expect(mockClientInstance.isUserAuthorized).toHaveBeenCalledTimes(2); // Викликався ще раз
    //         expect(mockClientInstance.getMe).toHaveBeenCalledTimes(2); // Викликався ще раз
    //         expect(Api.channels.GetParticipant).toHaveBeenCalledWith({ // Викликався
    //             channel: channelName,
    //             participant: 'mockUserTelegram',
    //         });
    //          expect(mockClientInstance.invoke).toHaveBeenCalledTimes(2); // Викликався і впав

    //         expect(result2).toBe(false); // Повертає false з catch
    //          expect(t).toHaveBeenCalledWith('telegram.errors.subscribe_channel', {error: invokeError}); // Логує помилку
    //          expect(consoleErrorSpy).toHaveBeenCalledWith(t('telegram.errors.subscribe_channel', {error: invokeError}), invokeError);
    //     });
    // });
});
