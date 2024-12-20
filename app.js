require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 0;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Підключення до MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Підключення маршрутів
const indexRoutes = require('./routes/index');
const statusRoutes = require('./routes/status');
const telegramRoutes = require('./routes/telegram');
const authRoutes = require('./routes/auth');
const signUpRoutes = require('./routes/signUp');

// Використання маршрутів
// front
app.use('/', indexRoutes);           // Головна сторінка
app.use('/', statusRoutes);          // Сторінка статусу
app.use('/', signUpRoutes);          // Сторінка sign upa

// api
app.use('/api/telegram', telegramRoutes);
app.use('/api/auth', authRoutes); // маршрути для реєстрації та логіну

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  // const { initializeClient } = require('./controllers/telegramController');
  // await initializeClient();
});

module.exports = app;
