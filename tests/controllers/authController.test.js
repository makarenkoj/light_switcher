import { register, login, logout } from '../../controllers/authController.js';
import User from '../../models/userModel.js';
import { initializeClient } from '../../controllers/telegramController.js';
import { t } from '../../i18n.js';
import { generateToken } from '../../utils/tokenUtils.js';
import { io } from '../../app.js';

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
  t: jest.fn((key, options) => {
    if (options) {
        if (key === 'user.errors.validation' && options.validationErrors) {
            return `${key} error: ${options.validationErrors}`;
        }
        if (options.user) {
            return `${key} user: ${options.user.email || options.user._id}`;
        }
        if (options.error) {
            return `${key} error: ${options.error.message || options.error}`;
        }
    }
    if (key === 'user.errors.validation' && options?.validationErrors) {
      return `${key} error: ${options.validationErrors}`;
    }
    if (key === 'user.errors.registration' && options?.error?.message) {
      return `${key} error: ${options.error.message}`;
    }
    if (key === 'user.errors.login_failed' && (options?.error?.message || options?.error)) {
      return `${key} error: ${options.error.message || options.error}`;
    }
    if (key === 'user.errors.logout' && (options?.error?.message || options?.error)) {
      return `${key} error: ${options.error.message || options.error}`;
    }
    return key;
  }),
}));

jest.mock('../../utils/tokenUtils', () => ({
  __esModule: true,
  generateToken: jest.fn(),
}));

jest.mock('../../app', () => ({
    __esModule: true,
    io: {
        emit: jest.fn(),
    },
}));

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('AuthController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    t.mockClear();
    t.mockImplementation((key, options) => {
      if (options) {
        if (key === 'user.errors.validation' && options.validationErrors) {
          return `${key} error: ${options.validationErrors}`;
        }
        if (options.user) {
          return `${key} user: ${options.user.email || options.user._id}`;
        }
        if (options.error) {
          return `${key} error: ${options.error.message || options.error}`;
        }
      }
      return key;
    });

    User.create.mockReset();
    User.findOne.mockReset();
    initializeClient.mockReset();
    initializeClient.mockResolvedValue('mockSession');
    generateToken.mockReset();
    generateToken.mockReturnValue('mockToken');
    io.emit.mockReset();
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('register', () => {
    test('should successfully register the user and return 201', async () => {
      const mockUser = { _id: 'mockUserId', email: 'test@example.com', phoneNumber: '1234567890', role: 'user' };
      User.create.mockResolvedValue(mockUser);
      generateToken.mockReturnValue('mockToken');
      mockReq.body = { email: 'test@example.com', password: 'password123', phoneNumber: '1234567890', role: 'user' };

      await register(mockReq, mockRes);

      expect(User.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '1234567890',
        role: 'user',
      });
      expect(generateToken).toHaveBeenCalledWith(mockUser);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'user.success.create',
        token: 'mockToken',
        userId: 'mockUserId',
      });
      expect(io.emit).toHaveBeenCalledWith('userNotification', { message: t('user.success.new', { user: mockUser }) });
      expect(t).toHaveBeenCalledWith('user.success.create');
      expect(t).toHaveBeenCalledWith('user.success.new', { user: mockUser });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should return a 409 error for duplicate email', async () => {
      const error = { code: 11000, keyPattern: { email: 1 }, message: 'Duplicate key error' };
      User.create.mockRejectedValue(error);
      mockReq.body = { email: 'existing@example.com', password: 'password123', phoneNumber: '1234567890', role: 'user' };

      await register(mockReq, mockRes);

      expect(User.create).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.email_taken' });
      expect(io.emit).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.email_taken');
      expect(consoleErrorSpy).toHaveBeenCalledWith('user.errors.email_taken');
    });

    test('should return a 409 error on duplicate phoneNumber', async () => {
      const error = { code: 11000, keyPattern: { phoneNumber: 1 }, message: 'Duplicate key error' };
      User.create.mockRejectedValue(error);
      mockReq.body = { email: 'test@example.com', password: 'password123', phoneNumber: 'existingphone', role: 'user' };

      await register(mockReq, mockRes);

      expect(User.create).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.phone_taken' });
      expect(io.emit).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.phone_taken');
    });

    test('should return error 409 for duplicate email and phoneNumber', async () => {
      const error = { code: 11000, keyPattern: { email: 1, phoneNumber: 1 }, message: 'Duplicate key error' };
      User.create.mockRejectedValue(error);
      mockReq.body = { email: 'existing@example.com', password: 'password123', phoneNumber: 'existingphone' };

      await register(mockReq, mockRes);

      expect(User.create).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.email_phone_taken' });
      expect(io.emit).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.email_phone_taken');
    });


    test('should return error 422 on validation error', async () => {
      const validationError = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required', kind: 'required', path: 'email' },
          password: { message: 'Password is required', kind: 'required', path: 'password' },
        },
      };
      User.create.mockRejectedValue(validationError);
      mockReq.body = { email: 'invalid-email' }; // Не вистачає пароля

      await register(mockReq, mockRes);

      expect(User.create).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      const expectedJsonErrorMsg = t('user.errors.validation', { validationErrors: 'Email is required, Password is required' });
      expect(mockRes.json).toHaveBeenCalledWith({ error: expectedJsonErrorMsg });
      expect(consoleErrorSpy).toHaveBeenCalledWith(t('user.errors.validation', { error: 'Email is required, Password is required' }));
      expect(t).toHaveBeenCalledWith('user.errors.validation', { error: 'Email is required, Password is required' });
      expect(t).toHaveBeenCalledWith('user.errors.validation', { validationErrors: 'Email is required, Password is required' });
      expect(io.emit).not.toHaveBeenCalled();
    });

    test('should return error 422 on other registration error', async () => {
      const otherError = new Error('Some other database error');
      User.create.mockRejectedValue(otherError);
      mockReq.body = { email: 'test@example.com', password: 'password123', phoneNumber: '1234567890' };

      await register(mockReq, mockRes);

      expect(User.create).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      const expectedJsonErrorMsg = t('user.errors.registration', { error: otherError.message });
      expect(mockRes.json).toHaveBeenCalledWith({ error: expectedJsonErrorMsg });

      expect(consoleErrorSpy).toHaveBeenCalledWith(t('user.errors.registration', { error: otherError }));
      expect(t).toHaveBeenCalledWith('user.errors.registration', { error: otherError });
      expect(t).toHaveBeenCalledWith('user.errors.registration', { error: otherError.message });
      expect(io.emit).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    let mockUser;
    let mockAdminUser;

    beforeEach(() => {
      mockUser = {
        _id: 'mockUserId',
        email: 'user@example.com',
        password: 'hashedPassword',
        role: 'user',
        comparePassword: jest.fn(),
      };

      mockAdminUser = {
          _id: 'mockAdminId',
          email: 'admin@example.com',
          password: 'hashedAdminPassword',
          role: 'admin',
          comparePassword: jest.fn(),
      };

      User.findOne.mockReset();
      initializeClient.mockReset();
      initializeClient.mockResolvedValue('mockSession');
      generateToken.mockReset();
      generateToken.mockReturnValue('mockToken');
      io.emit.mockReset();
    });

    test('should successfully authorize the user (not admin) and return 200 (with restoredSesion)', async () => {
      User.findOne
        .mockImplementationOnce(async (query) => {
          expect(query).toEqual({ email: mockUser.email });
          return mockUser;
        })
        .mockImplementationOnce(async (query) => {
          expect(query).toEqual({ role: 'admin' });
          return mockAdminUser;
        });

      mockUser.comparePassword.mockResolvedValue(true);

      mockReq.body = { email: mockUser.email, password: 'password123' };

      await login(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledTimes(2);

      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(initializeClient).toHaveBeenCalledWith(mockAdminUser._id);
      expect(generateToken).toHaveBeenCalledWith(mockUser);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'user.success.login',
        token: 'mockToken',
        restoredSesion: 'mockSession',
        userId: mockUser._id,
      });
    expect(io.emit).toHaveBeenCalledWith('userNotification', { message: t('user.success.login_new', { user: mockUser }) });
    expect(t).toHaveBeenCalledWith('user.success.login');
    expect(t).toHaveBeenCalledWith('user.success.login_new', { user: mockUser });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('should successfully authenticate the administrator and return 200 (with restoredSesion)', async () => {
    User.findOne
      .mockImplementationOnce(async (query) => {
        expect(query).toEqual({ email: mockAdminUser.email });
        return mockAdminUser;
      })
      .mockImplementationOnce(async (query) => {
        expect(query).toEqual({ role: 'admin' });
        return mockAdminUser;
      });

    mockAdminUser.comparePassword.mockResolvedValue(true);
    mockReq.body = { email: mockAdminUser.email, password: 'adminpassword' };

    await login(mockReq, mockRes);

    expect(User.findOne).toHaveBeenCalledTimes(2);
    expect(mockAdminUser.comparePassword).toHaveBeenCalledWith('adminpassword');
    expect(initializeClient).toHaveBeenCalledWith(mockAdminUser._id);
    expect(generateToken).toHaveBeenCalledWith(mockAdminUser);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'user.success.login',
      token: 'mockToken',
      restoredSesion: 'mockSession',
      userId: mockAdminUser._id,
    });
    expect(io.emit).toHaveBeenCalledWith('userNotification', { message: t('user.success.login_new', { user: mockAdminUser }) });
    expect(t).toHaveBeenCalledWith('user.success.login');
    expect(t).toHaveBeenCalledWith('user.success.login_new', { user: mockAdminUser });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test('should return a 401 error if the user is not found by email', async () => {
    User.findOne.mockImplementationOnce(async (query) => {
        expect(query).toEqual({ email: 'nonexistent@example.com' });
        return null;
    });

    mockReq.body = { email: 'nonexistent@example.com', password: 'password123' };

    await login(mockReq, mockRes);

    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(mockUser.comparePassword).not.toHaveBeenCalled();
    expect(initializeClient).not.toHaveBeenCalled();
    expect(generateToken).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.password_email' });
    expect(io.emit).not.toHaveBeenCalled();
    expect(t).toHaveBeenCalledWith('user.errors.password_email');
    expect(consoleErrorSpy).toHaveBeenCalledWith('user.errors.password_email');
  });

  test('should return a 401 error if the password is incorrect', async () => {
    User.findOne.mockImplementationOnce(async (query) => {
        expect(query).toEqual({ email: mockUser.email });
        return mockUser;
    });
    mockUser.comparePassword.mockResolvedValue(false);
    mockReq.body = { email: mockUser.email, password: 'wrongpassword' };

    await login(mockReq, mockRes);

    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
    expect(initializeClient).not.toHaveBeenCalled();
    expect(generateToken).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'user.errors.password_email' });
    expect(io.emit).not.toHaveBeenCalled();
    expect(t).toHaveBeenCalledWith('user.errors.password_email');
    expect(consoleErrorSpy).toHaveBeenCalledWith('user.errors.password_email');
  });

  test('should successfully authorize the user even if the admin is not found (restoredSesion: false)', async () => {
    User.findOne
      .mockImplementationOnce(async (query) => {
        expect(query).toEqual({ email: mockUser.email });
        return mockUser;
      })
      .mockImplementationOnce(async (query) => {
        expect(query).toEqual({ role: 'admin' });
        return null;
      });

    mockUser.comparePassword.mockResolvedValue(true);
    mockReq.body = { email: mockUser.email, password: 'password123' };

    await login(mockReq, mockRes);

    expect(User.findOne).toHaveBeenCalledTimes(2);
    expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
    expect(initializeClient).not.toHaveBeenCalled();
    expect(generateToken).toHaveBeenCalledWith(mockUser);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'user.success.login',
      token: 'mockToken',
      restoredSesion: false,
      userId: mockUser._id,
    });
    expect(io.emit).toHaveBeenCalledWith('userNotification', { message: t('user.success.login_new', { user: mockUser }) });
    expect(t).toHaveBeenCalledWith('user.success.login');
    expect(t).toHaveBeenCalledWith('user.success.login_new', { user: mockUser });
    expect(t).toHaveBeenCalledWith('user.errors.admin_not_found');
    expect(consoleErrorSpy).toHaveBeenCalledWith('user.errors.admin_not_found');
  });

  test('should return error 422 on error during initializeClient', async () => {
    const initializeClientError = new Error('Telegram initialization failed');
    User.findOne
      .mockImplementationOnce(async (query) => {
        expect(query).toEqual({ email: mockUser.email });
        return mockUser;
      })
      .mockImplementationOnce(async (query) => {
        expect(query).toEqual({ role: 'admin' });
        return mockAdminUser;
      });

    mockUser.comparePassword.mockResolvedValue(true);
    initializeClient.mockRejectedValue(initializeClientError);

    mockReq.body = { email: mockUser.email, password: 'password123' };

    await login(mockReq, mockRes);

    expect(User.findOne).toHaveBeenCalledTimes(2);
    expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
    expect(initializeClient).toHaveBeenCalledWith(mockAdminUser._id);
    expect(generateToken).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(422);
    const expectedJsonErrorMsg = t('user.errors.login_failed', { error: initializeClientError.message });
    expect(mockRes.json).toHaveBeenCalledWith({ error: expectedJsonErrorMsg });
    expect(io.emit).not.toHaveBeenCalled();
    expect(t).toHaveBeenCalledWith('user.errors.login_failed', { error: initializeClientError });
    expect(t).toHaveBeenCalledWith('user.errors.login_failed', { error: initializeClientError.message });
    const expectedConsoleErrorMsg = t('user.errors.login_failed', { error: initializeClientError });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expectedConsoleErrorMsg);
  });

  test('should return error 422 on user search failure', async () => {
    const findUserError = new Error('Database find error');
    User.findOne.mockImplementationOnce(async (query) => {
      expect(query).toEqual({ email: mockUser.email });
      throw findUserError;
    });

    mockReq.body = { email: mockUser.email, password: 'password123' };

    await login(mockReq, mockRes);

    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(mockUser.comparePassword).not.toHaveBeenCalled();
    expect(initializeClient).not.toHaveBeenCalled();
    expect(generateToken).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(422);
    const expectedJsonErrorMsg = t('user.errors.login_failed', { error: findUserError.message });
    expect(mockRes.json).toHaveBeenCalledWith({ error: expectedJsonErrorMsg });
    expect(io.emit).not.toHaveBeenCalled();
    expect(t).toHaveBeenCalledWith('user.errors.login_failed', { error: findUserError });
    expect(t).toHaveBeenCalledWith('user.errors.login_failed', { error: findUserError.message });
    expect(consoleErrorSpy).toHaveBeenCalledWith(t('user.errors.login_failed', { error: findUserError }));
  });

  test('should return error 422 on admin search error', async () => {
    const findAdminError = new Error('Database find admin error');
    User.findOne
      .mockImplementationOnce(async (query) => {
        expect(query).toEqual({ email: mockUser.email });
        return mockUser;
      })
      .mockImplementationOnce(async (query) => {
        expect(query).toEqual({ role: 'admin' });
        throw findAdminError;
      });

      mockUser.comparePassword.mockResolvedValue(true);
      mockReq.body = { email: mockUser.email, password: 'password123' };

      await login(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledTimes(2);
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(initializeClient).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(422);
      const expectedJsonErrorMsg = t('user.errors.login_failed', { error: findAdminError.message });
      expect(mockRes.json).toHaveBeenCalledWith({ error: expectedJsonErrorMsg });
      expect(io.emit).not.toHaveBeenCalled();
      expect(t).toHaveBeenCalledWith('user.errors.login_failed', { error: findAdminError });
      expect(t).toHaveBeenCalledWith('user.errors.login_failed', { error: findAdminError.message });
      expect(consoleErrorSpy).toHaveBeenCalledWith(t('user.errors.login_failed', { error: findAdminError }));
    });
  });

  describe('logout', () => {
    test('should successfully log out and return a status of 200', async () => {
      await logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'user.success.logout' });
      expect(io.emit).toHaveBeenCalledWith('userNotification', { message: 'user.success.logout' });
      expect(t).toHaveBeenCalledWith('user.success.logout');
      expect(t).toHaveBeenCalledWith('user.success.logout');
    });

    test('should return error 422 on exit error', async () => {
      const logoutError = new Error('Some logout error');
      io.emit.mockImplementation(() => { throw logoutError; });

      await logout(mockReq, mockRes);

      expect(io.emit).toHaveBeenCalledWith('userNotification', { message: t('user.success.logout') });
      expect(mockRes.status).toHaveBeenCalledWith(422);

      const expectedJsonErrorMsg = t('user.errors.logout', { error: logoutError.message });
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({ error: expectedJsonErrorMsg });

      expect(t).toHaveBeenCalledWith('user.success.logout');
      expect(t).toHaveBeenCalledWith('user.errors.logout', { error: logoutError });
      expect(t).toHaveBeenCalledWith('user.errors.logout', { error: logoutError.message });
      const expectedConsoleErrorMsg = t('user.errors.logout', { error: logoutError });
      expect(consoleErrorSpy).toHaveBeenCalledWith(expectedConsoleErrorMsg);
    });
  });
});
