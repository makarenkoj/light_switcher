require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const http = require('http');

let mongoServer;
let realMongoose;
let mockHttpServer;

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '1234567890abcdef1234567890abcdef';

if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
  console.error("Jest configuration error: ENCRYPTION_KEY is not set or has the wrong length.");
  throw new Error("Testing settings: ENCRYPTION_KEY is invalid.");
}

realMongoose = jest.requireActual('mongoose');

jest.mock('mongoose', () => {
  const mockConnection = { /* ... */ };
  const mockSchemaConstructor = jest.fn((def, opts) => {
    const mockSchemaInstance = {
      pre: jest.fn(),
      post: jest.fn(),
      index: jest.fn(),
      methods: {},
      statics: {},
      plugin: jest.fn(),
    };

    return mockSchemaInstance;
  });

  mockSchemaConstructor.Types = { /* ... */ };

  const mockMongoose = {
    connect: jest.fn(async () => { /* ... */ }),
    disconnect: jest.fn(async () => { /* ... */ }),
    connection: mockConnection,
    Schema: mockSchemaConstructor,
    Types: { /* ... */ },
    isValidObjectId: jest.fn(),
    model: jest.fn(name => {
      return {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn(data => ({
          _id: 'mockId' + Math.random().toString(36).substring(7),
          ...data
        })),
        findByIdAndUpdate: jest.fn(async (id, update, options) => ({
          _id: id,
          ...update
        })),
        deleteOne: jest.fn().mockResolvedValue({
          acknowledged: true,
          deletedCount: 1
        }),
      };
    }),
    set: jest.fn(),
    plugin: jest.fn(),
    default: {},
  };

  mockMongoose.default = mockMongoose;

  return mockMongoose;
});

jest.mock('./models/userModel.js', () => {
  const MockUserModel = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(query => {
      if (query && query.role === 'admin') {
        return Promise.resolve({ _id: 'mockAdminId', role: 'admin', username: 'admin_test' });
      }
      return Promise.resolve(null);
    }),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(data => ({ _id: 'mockId' + Math.random().toString(36).substring(7), ...data })),
    findByIdAndUpdate: jest.fn(async (id, update, options) => ({ _id: id, ...update })),
    deleteOne: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
    statics: {},
  };

  return MockUserModel
});

jest.mock('./models/sessionModel.js', () => {
  const MockSessionModel = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    create: jest.fn(data => ({ _id: 'mockId' + Math.random().toString(36).substring(7), ...data })),
  };

  return MockSessionModel
});

jest.mock('./models/telegramModel.js', () => {
  const MockTelegramModel = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(data => ({ _id: 'mockId' + Math.random().toString(36).substring(7), ...data })),
    findByIdAndUpdate: jest.fn(async (id, update, options) => ({ _id: id, ...update })),
    deleteOne: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
    getDecryptedApiId: jest.fn(),
    getDecryptedApiHash: jest.fn(),
  };

  return MockTelegramModel
});

jest.mock('./models/devicesModel.js', () => {
  const MockDevicesModel = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(data => ({ _id: 'mockId' + Math.random().toString(36).substring(7), ...data })),
    findByIdAndUpdate: jest.fn(async (id, update, options) => ({ _id: id, ...update })),
    deleteOne: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
    getDecryptedApiId: jest.fn(),
    getDecryptedApiHash: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  return MockDevicesModel
});

jest.mock('./models/devicesTriggersModel.js', () => {
  const MockDevicesTriggersModel = jest.fn();

  MockDevicesTriggersModel.find = jest.fn().mockResolvedValue([]);
  MockDevicesTriggersModel.findOne = jest.fn().mockResolvedValue(null);
  MockDevicesTriggersModel.findById = jest.fn().mockResolvedValue(null);
  MockDevicesTriggersModel.create = jest.fn(data => ({
    _id: 'mockId' + Math.random().toString(36).substring(7),
    ...data
  }));

  MockDevicesTriggersModel.findByIdAndUpdate = jest.fn(async (id, update, options) => ({
    _id: id,
    ...update
  }));

  MockDevicesTriggersModel.deleteOne = jest.fn().mockResolvedValue({
    acknowledged: true,
    deletedCount: 1
  });

  MockDevicesTriggersModel.countDocuments = jest.fn().mockResolvedValue(0);

  if (MockDevicesTriggersModel.getDecryptedApiId) delete MockDevicesTriggersModel.getDecryptedApiId;
  if (MockDevicesTriggersModel.getDecryptedApiHash) delete MockDevicesTriggersModel.getDecryptedApiHash;

  return MockDevicesTriggersModel
});

jest.mock('./models/triggersModel.js', () => {
  const MockTriggersModel = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn(data => ({ _id: 'mockId' + Math.random().toString(36).substring(7), ...data })),
    findByIdAndUpdate: jest.fn(async (id, update, options) => ({ _id: id, ...update })),
    deleteOne: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
    getDecryptedApiId: jest.fn(),
    getDecryptedApiHash: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  return MockTriggersModel
});

jest.spyOn(http, 'createServer').mockImplementation((app) => {
  mockHttpServer = { /* ... моки listen, close, on, listeners, removeAllListeners ... */
    listen: jest.fn((port, callback) => {
      if (callback) callback();
    }),
    close: jest.fn((callback) => {
      if (callback) callback();
    }),
    on: jest.fn(),
    listeners: jest.fn((event) => {
      return [];
    }),
    removeAllListeners: jest.fn((event) => {
    }),
  };

  return mockHttpServer;
});

const mongoose = require('mongoose');

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  if (realMongoose.connection.readyState === 0) {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await realMongoose.connect(uri);
  }
});

afterAll(async () => {
  if (realMongoose.connection.readyState !== 0) {
    await realMongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
  jest.restoreAllMocks();
});

beforeEach(async () => {
  if (realMongoose.connection.readyState !== 0) {
    const collections = await realMongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany();
    }
  } else {
    console.warn('BeforeEach: Skipping database clear, realMongoose not connected.');
  }
});
