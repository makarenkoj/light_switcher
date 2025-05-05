import { register, login, logout } from '../../controllers/adminController'; // Шлях до вашого файлу
import User from '../../models/userModel';
import { initializeClient } from '../../controllers/telegramController';
import { t } from '../../i18n';
import { generateToken } from '../../utils/tokenUtils';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

afterAll(async () => {
  await mongoose.connection.close();
});

jest.mock('../../models/userModel', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../../controllers/telegramController', () => ({
  __esModule: true,
  initializeClient: jest.fn(),
}));

jest.mock('../../i18n', () => ({
  __esModule: true,
  t: jest.fn((key) => key),
}));

jest.mock('../../utils/tokenUtils', () => ({
  __esModule: true,
  generateToken: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AdminController', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    t.mockImplementation((key) => key);
  });

  describe('register', () => {
    const adminEmail = 'admin@example.com';
    beforeEach(() => {
      process.env.ADMIN_EMAIL = adminEmail;
      User.create.mockReset();
      generateToken.mockReset();
    });

    test('повинен успішно зареєструвати адміністратора з правильною поштою', async () => {
      const mockUser = { _id: 'mockUserId' };
      User.create.mockResolvedValue(mockUser);
      generateToken.mockReturnValue('mockToken');
      mockReq.body = { email: adminEmail, password: 'password123', phoneNumber: '1234567890' };

      await register(mockReq, mockRes);

      expect(User.create).toHaveBeenCalledWith({
        email: adminEmail,
        password: 'password123',
        phoneNumber: '1234567890',
        role: 'admin',
      });
      expect(generateToken).toHaveBeenCalledWith(mockUser);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'user.success.create',
        token: 'mockToken',
        userId: 'mockUserId',
      });
    });

    test('повинен повернути помилку 403, якщо пошта не є поштою адміністратора', async () => {
      mockReq.body = { email: 'wrong@example.com', password: 'password123', phoneNumber: '1234567890' };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.admin_email' });
      expect(User.create).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    test('повинен повернути помилку 409 при дублікаті email', async () => {
      const error = { code: 11000, keyPattern: { email: 1 } };
      User.create.mockRejectedValue(error);
      mockReq.body = { email: adminEmail, password: 'password123', phoneNumber: '1234567890' };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.email_taken' });
    });

    test('повинен повернути помилку 409 при дублікаті phoneNumber', async () => {
      const error = { code: 11000, keyPattern: { phoneNumber: 1 } };
      User.create.mockRejectedValue(error);
      mockReq.body = { email: adminEmail, password: 'password123', phoneNumber: '1234567890' };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.phone_taken' });
    });

    test('повинен повернути помилку 422 при помилці валідації', async () => {
      const error = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          password: { message: 'Password is required' },
        },
      };
      User.create.mockRejectedValue(error);
      mockReq.body = { email: adminEmail };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.validation' });
    });

    test('повинен повернути помилку 422 при іншій помилці реєстрації', async () => {
      const error = new Error('Database connection error');
      User.create.mockRejectedValue(error);
      mockReq.body = { email: adminEmail, password: 'password123', phoneNumber: '1234567890' };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.registration' });
    });
  });

  describe('login', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = {
        _id: 'mockUserId',
        email: 'admin@example.com',
        password: 'hashedPassword',
        role: 'admin',
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      User.findOne.mockResolvedValue(mockUser);
      initializeClient.mockReset();
      generateToken.mockReset();
    });

    test('повинен успішно авторизувати адміністратора з правильними обліковими даними', async () => {
      const mockUser = { _id: 'mockUserId', email: 'admin@example.com', password: 'hashedPassword', role: 'admin', comparePassword: jest.fn().mockResolvedValue(true) };
      User.findOne.mockResolvedValue(mockUser);
      initializeClient.mockResolvedValue('mockSession');
      generateToken.mockReturnValue('mockToken');
      mockReq.body = { email: 'admin@example.com', password: 'password123' };

      await login(mockReq, mockRes);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'admin@example.com' });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(initializeClient).toHaveBeenCalledWith('mockUserId');
      expect(generateToken).toHaveBeenCalledWith(mockUser);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'user.success.login',
        token: 'mockToken',
        restoredSesion: 'mockSession',
        userId: 'mockUserId',
      });
    });

    test('повинен повернути помилку 403, якщо користувач не є адміністратором', async () => {
      const mockUser = { _id: 'mockUserId', email: 'user@example.com', password: 'hashedPassword', role: 'user', comparePassword: jest.fn().mockResolvedValue(true) };
      User.findOne.mockResolvedValue(mockUser);
      mockReq.body = { email: 'user@example.com', password: 'password123' };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.not_admin' });
      expect(initializeClient).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    test('повинен повернути помилку 401, якщо користувача не знайдено або пароль неправильний', async () => {
      User.findOne.mockResolvedValue(null);
      mockReq.body = { email: 'admin@example.com', password: 'wrongPassword' };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.password_email' });

      User.findOne.mockResolvedValue({ comparePassword: jest.fn().mockResolvedValue(false), role: 'admin' });
      await login(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.password_email' });
    });

    test('повинен повернути помилку 422 при помилці під час входу', async () => {
      const error = new Error('Failed to connect to Telegram');
      User.findOne.mockResolvedValue({ _id: 'mockUserId', role: 'admin', comparePassword: jest.fn().mockResolvedValue(true) });
      initializeClient.mockRejectedValue(error);
      mockReq.body = { email: 'admin@example.com', password: 'password123' };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.login_failed' });
    });
  });

  describe('logout', () => {
    test('повинен успішно вийти з системи та повернути статус 200', async () => {
      await logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'user.success.logout' });
    });
  });
});
