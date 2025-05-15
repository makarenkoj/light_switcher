import { register, login, logout } from '../../controllers/adminController';
import User from '../../models/userModel';
import { initializeClient } from '../../controllers/telegramController';
import { t } from '../../i18n';
import { generateToken } from '../../utils/tokenUtils';

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

    test('must successfully register an administrator with the correct email', async () => {
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

    test('should return a 403 error if the email is not an administrator email', async () => {
      mockReq.body = { email: 'wrong@example.com', password: 'password123', phoneNumber: '1234567890' };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.admin_email' });
      expect(User.create).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    test('should return a 409 error for duplicate email', async () => {
      const error = { code: 11000, keyPattern: { email: 1 } };
      User.create.mockRejectedValue(error);
      mockReq.body = { email: adminEmail, password: 'password123', phoneNumber: '1234567890' };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.email_taken' });
    });

    test('should return a 409 error on duplicate phoneNumber', async () => {
      const error = { code: 11000, keyPattern: { phoneNumber: 1 } };
      User.create.mockRejectedValue(error);
      mockReq.body = { email: adminEmail, password: 'password123', phoneNumber: '1234567890' };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.phone_taken' });
    });

    test('should return error 422 on validation error', async () => {
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

    test('should return error 422 on other registration error', async () => {
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

    test('must successfully authenticate the administrator with the correct credentials', async () => {
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

    test('should return a 403 error if the user is not an administrator', async () => {
      const mockUser = { _id: 'mockUserId', email: 'user@example.com', password: 'hashedPassword', role: 'user', comparePassword: jest.fn().mockResolvedValue(true) };
      User.findOne.mockResolvedValue(mockUser);
      mockReq.body = { email: 'user@example.com', password: 'password123' };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.not_admin' });
      expect(initializeClient).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    test('should return a 401 error if the user is not found or the password is incorrect', async () => {
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

    test('should return error 422 on login failure', async () => {
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
    test('should successfully log out and return a status of 200', async () => {
      await logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'user.success.logout' });
    });
  });
});
