import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

let server;
let user;
let token;

jest.mock('telegram');
jest.setTimeout(30000);

describe('Telegram API Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    user = await User.create({
      email: 'test@example.com',
      password: 'password123'
    });
    token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'supersecretkey');
    server = app.listen(0);
  });

  afterAll(async () => {
    await User.deleteMany({});

    console.log('Closing DB connection');
    await mongoose.disconnect();

    console.log('Closing server');
    await server.close();
  });

  it('POST /api/telegram/sendCode — He успішне надсилання коду', async () => {
    const response = await request(server)
      .post('/api/telegram/sendCode')
      .set('Authorization', `Bearer ${token}`)
      .send({ phoneNumber: '+380505782233' });
    
    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty('error', 'Failed to send code');
    expect(response.body).not.toHaveProperty('phoneCodeHash');
  });

  it('POST /api/telegram/signIn — He успішна авторизація з кодом', async () => {
    const phoneCodeHash = 'example_hash';
    const response = await request(server)
      .post('/api/telegram/signIn')
      .set('Authorization', `Bearer ${token}`)
      .send({ phoneNumber: '+380501234567', phoneCodeHash, code: '12345' });
    
    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty('error', 'Sign-in failed');
  });

  it('GET /api/telegram/checkSession — повертає статус сесії', async () => {
    const response = await request(server)
      .get('/api/telegram/checkSession')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('authorized');
  });
});
