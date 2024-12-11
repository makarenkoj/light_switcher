require('dotenv').config({ path: '.env.test' });
const jwt = require('jsonwebtoken');
const authenticateUser = require('../middleware/authMiddleware');
const User = require('../models/userModel');

jest.mock('jsonwebtoken');
jest.mock('../models/userModel');

describe('authMiddleware', () => {
  it('Додає користувача до запиту, якщо токен дійсний', async () => {
    const req = { headers: { authorization: 'Bearer valid_token' } };
    const res = {};
    const next = jest.fn();

    jwt.verify.mockReturnValue({ userId: 'userId123' });
    User.findById.mockResolvedValue({ _id: 'userId123', email: 'test@example.com' });

    await authenticateUser(req, res, next);
    
    expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET);
    expect(req.user).toEqual({ _id: 'userId123', email: 'test@example.com' });
    expect(next).toHaveBeenCalled();
  });

  it('Повертає помилку 401, якщо токен недійсний', async () => {
    const req = { headers: { authorization: 'Bearer invalid_token' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

    await authenticateUser(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
});
