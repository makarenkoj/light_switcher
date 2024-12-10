const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { initializeClient } = require('./telegramController');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

exports.register = async (req, res) => {
  try {
    console.log(req.body)
    const { email, password } = req.body;
    const user = await User.create({ email, password });
    res.status(201).json({ message: 'User created successfully', userId: user._id });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'User registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    };

    const restoredSesion = await initializeClient(user._id);

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ message: 'Login successful', token, restoredSesion: restoredSesion });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.logout = async (req, res) => {
  try {
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};
