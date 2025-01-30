import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { initializeClient } from './telegramController.js';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

async function register(req, res) {
  try {
    console.log(req.body)
    const { email, password, phoneNumber } = req.body;
    const user = await User.create({ email, password, phoneNumber });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ message: 'User created successfully', token, userId: user._id });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'User registration failed' });
  }
};

async function login(req, res) {
  try {
    console.log(req.body)
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      console.log('Invalid email or password')

      return res.status(401).json({ error: 'Invalid email or password' });
    };

    const restoredSesion = await initializeClient(user._id);
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });
    console.log('USER:', user)

    res.status(200).json({ message: 'Login successful', token, restoredSesion: restoredSesion, userId: user._id });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

async function logout(req, res) {
  try {
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export { register, login, logout };
