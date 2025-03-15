import 'dotenv/config';
import cors from 'cors';
import express  from 'express';
import mongoose  from 'mongoose';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { Server } from "socket.io";
import { createServer } from "http";
// import { initializeClient } from './controllers/telegramController.js';

const app = express();
const PORT = process.env.PORT || 5001;

const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cors
app.use(cors({
  origin: process.env.CLIENT || 'http://localhost:3000',
  credentials: true,
}));

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
import usersRoutes from './routes/users.js';
import deviceRoutes from './routes/device.js';
import triggerRoutes from './routes/trigger.js';
// import deviceTriggerRoutes from './routes/deviceTrigger.js';

// Використання маршрутів
// front
app.use('/', indexRoutes);           // Головна сторінка
app.use('/', statusRoutes);          // Сторінка статусу
app.use('/', signUpRoutes);          // Сторінка sign upa

// api
app.use('/api/telegram', telegramRoutes);
app.use('/api/auth', authRoutes); // маршрути для реєстрації та логіну
app.use('/api/users', usersRoutes); 
app.use('/api/devices', deviceRoutes); // маршрути для керування пристроєм
app.use('/api/triggers', triggerRoutes);

// Налаштування WebSocket-з'єднань
io.on('connection', (socket) => {
  console.log(`🟢 New WebSocket connection: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔴 WebSocket disconnected: ${socket.id}`);
  });
});

// Запуск сервера
server.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('\nstart device\n');
  // await initializeClient();
  console.log('\nstart success\n');
});

export default app;
