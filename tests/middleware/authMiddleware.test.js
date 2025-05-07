jest.mock('jsonwebtoken', () => {
  return {
    verify: jest.fn((token, secret) => {
      return { userId: 'defaultMockedUserId' }; 
    }),
    sign: jest.fn().mockReturnValue('mockedSignedToken'),
  };
});

  jest.mock('../../models/userModel', () => {
  return {
    __esModule: true,
    default: {
      create: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(id => {
        return Promise.resolve(null); 
      }),
    },
  };
});

jest.mock('../../i18n', () => {
  return {
    __esModule: true,
    default: {
      t: jest.fn(key => {
        return key;
      }),
      changeLanguage: jest.fn(lang => {
      }),
    },
    t: jest.fn(key => {
      return key;
    }),
  };
});

const originalJwtSecret = process.env.JWT_SECRET;

describe('AuthMiddleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let detectLanguageSpy;
  let currentMiddlewareModule;
  let mockJwt;
  let mockUser;
  let mockI18n;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'testsecret';
    currentMiddlewareModule = require('../../middleware/authMiddleware');
    mockJwt = require('jsonwebtoken');
    mockUser = require('../../models/userModel').default;
    mockI18n = require('../../i18n').default;

    mockReq = {
        headers: {},
    };

    mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };

    mockNext = jest.fn();

    if (currentMiddlewareModule && typeof currentMiddlewareModule.detectLanguage === 'function') {
        detectLanguageSpy = jest.spyOn(currentMiddlewareModule, 'detectLanguage');
    } else {
        detectLanguageSpy = undefined;
    }
  });

  afterEach(() => {
    if (detectLanguageSpy) {
      detectLanguageSpy.mockRestore();
    }
      process.env.JWT_SECRET = originalJwtSecret; 
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  describe('detectLanguage', () => {
    test('should set req.language and change the i18n language if the Accept-Language header is present', () => {
      mockReq.headers['accept-language'] = 'en-US,en;q=0.9,fr;q=0.8';
      currentMiddlewareModule.detectLanguage(mockReq);

      expect(mockReq.language).toBe('en-US');
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('en-US');
    });

    test('should do nothing if the Accept-Language header is missing', () => {
      currentMiddlewareModule.detectLanguage(mockReq);

      expect(mockReq.language).toBeUndefined();
      expect(mockI18n.changeLanguage).not.toHaveBeenCalled();
    });

    test('must handle an empty Accept-Language header', () => {
      mockReq.headers['accept-language'] = '';
      currentMiddlewareModule.detectLanguage(mockReq);

      expect(mockReq.language).toBeUndefined();
      expect(mockI18n.changeLanguage).not.toHaveBeenCalled();
     });

    test('must process the Accept-Language header without a comma', () => {
      mockReq.headers['accept-language'] = 'fr';
      currentMiddlewareModule.detectLanguage(mockReq);

      expect(mockReq.language).toBe('fr');
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('fr');
    });
  });

  describe('authenticateUser', () => {
    test('should return 401 if the Authorization header is missing', async () => {
      await currentMiddlewareModule.authenticateUser(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token not provided' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(mockUser.findById).not.toHaveBeenCalled();
    });

    test('should return 401 if the Authorization header is incorrect (not Bearer)', async () => {
      mockReq.headers.authorization = 'InvalidToken token';    
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Test: Malformed JWT for non-Bearer');
      });

      await currentMiddlewareModule.authenticateUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockJwt.verify).toHaveBeenCalledWith('token', process.env.JWT_SECRET);
      expect(mockUser.findById).not.toHaveBeenCalled();
    });

    test('should return 401 if the Authorization header is incorrect (no token after Bearer)', async () => {
      mockReq.headers.authorization = 'Bearer ';

      await currentMiddlewareModule.authenticateUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token not provided' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(mockUser.findById).not.toHaveBeenCalled();
    });

    test('must call jwt.verify with the correct token and secret', async () => {
      const token = 'validtoken';
      mockReq.headers.authorization = `Bearer ${token}`;
      const decodedPayload = { userId: 'testUserId' };
      mockJwt.verify.mockReturnValue(decodedPayload);
      mockUser.findById.mockResolvedValue({ _id: 'testUserId', role: 'user' });

      await currentMiddlewareModule.authenticateUser(mockReq, mockRes, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(mockUser.findById).toHaveBeenCalledWith('testUserId');
      expect(mockReq.user).toEqual({ _id: 'testUserId', role: 'user' });
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('should return 401 if jwt.verify throws an error', async () => {
      const token = 'invalidtoken';
      mockReq.headers.authorization = `Bearer ${token}`;
      const verificationError = new Error('Invalid signature');
      mockJwt.verify.mockImplementation(() => { throw verificationError; });

      await currentMiddlewareModule.authenticateUser(mockReq, mockRes, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should set req.user to null and call next() if the user is not found by the ID from the token', async () => {
      const token = 'validtoken';
      mockReq.headers.authorization = `Bearer ${token}`;
      const decodedPayload = { userId: 'testUserId' };
      mockJwt.verify.mockReturnValue(decodedPayload);
      mockUser.findById.mockResolvedValue(null);

      await currentMiddlewareModule.authenticateUser(mockReq, mockRes, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(mockUser.findById).toHaveBeenCalledWith('testUserId');
      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('should call detectLanguage at the beginning', async () => {
      const token = 'validtoken';
      mockReq.headers['accept-language'] = 'fr-FR';
      mockReq.headers.authorization = `Bearer ${token}`;
      const decodedPayload = { userId: 'testUserId' };
      mockJwt.verify.mockReturnValue(decodedPayload);
      mockUser.findById.mockResolvedValue({ _id: 'testUserId', role: 'user' });

      await currentMiddlewareModule.authenticateUser(mockReq, mockRes, mockNext);

      expect(mockReq.language).toBe('fr-FR');
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('fr-FR');
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('adminMiddleware', () => {
    test('should call next() if req.user is an admin', () => {
      mockReq.user = { role: 'admin' };
      currentMiddlewareModule.adminMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('should return 403 if req.user is null', () => {
      mockReq.user = null;
      currentMiddlewareModule.adminMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied' });
    });

    test('should return 403 if req.user is undefined', () => {
      currentMiddlewareModule.adminMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied' });
    });


    test('should return 403 if req.user is not an admin', () => {
      mockReq.user = { role: 'user' };
      currentMiddlewareModule.adminMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied' });
    });

    test('should return 403 if the req.user object does not have a role property', () => {
      mockReq.user = { _id: 'testUserId' };
      currentMiddlewareModule.adminMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied' });
    });
  });
});
