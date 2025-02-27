import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

export default async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in the environment variables.');
  }

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  global.process.env.MONGO_URI = mongoUri;
};
