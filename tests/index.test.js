require('dotenv').config({ path: '.env.test' });
const jwt = require('jsonwebtoken');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/userModel');

let server;
let user;
let token;

jest.setTimeout(30000);

describe('index', () => {
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

  it('Go to index page', async () => {
    const response = await request(server)
      .get('/')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
  });

//  it('Returns a 401 error if the token is invalid', async () => {
//     const response = await request(server)
//       .get('/')
//       .set('Authorization', `Bearer invalid token`);

//     expect(response.statusCode).toBe(401);
//   }); 
});
