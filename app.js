import 'dotenv/config';
import express  from 'express';
import mongoose  from 'mongoose';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 0;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Підключення до MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Підключення маршрутів
import indexRoutes from './routes/index.js';
import statusRoutes from './routes/status.js';
import telegramRoutes from './routes/telegram.js';
import authRoutes from './routes/auth.js';
import signUpRoutes from './routes/signUp.js';
import deviceRoutes from './routes/device.js';

// Використання маршрутів
// front
app.use('/', indexRoutes);           // Головна сторінка
app.use('/', statusRoutes);          // Сторінка статусу
app.use('/', signUpRoutes);          // Сторінка sign upa

// api
app.use('/api/telegram', telegramRoutes);
app.use('/api/auth', authRoutes); // маршрути для реєстрації та логіну
app.use('/api/device', deviceRoutes); // маршрути для керування пристроєм
// Запуск сервера
app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('\nstart device\n');
  console.log('\nstart success\n');
  // const { initializeClient } = require('./controllers/telegramController');
  // await initializeClient();
});

export default app;
