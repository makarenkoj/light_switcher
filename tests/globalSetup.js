require('dotenv').config({ path: '.env.test' });
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

module.exports = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in the environment variables.');
  }

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  global.process.env.MONGO_URI = mongoUri;
};
