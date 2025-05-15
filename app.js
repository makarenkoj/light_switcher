import 'dotenv/config';
import cors from 'cors';
import express  from 'express';
import mongoose  from 'mongoose';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { Server } from "socket.io";
import { createServer } from "http";
import { t } from './i18n.js';
import User from './models/userModel.js';
import { initializeClient } from './controllers/telegramController.js';
// import dotenv from 'dotenv';
// dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

let currentFilename;
let currentDirname;

if (typeof __filename !== 'undefined' && typeof __dirname !== 'undefined') {
  currentFilename = __filename;
  currentDirname = __dirname;
} else if (typeof import.meta.url !== 'undefined') {
  try {
    currentFilename = fileURLToPath(import.meta.url);
    currentDirname = path.dirname(currentFilename);
  } catch (e) {
    console.warn('Failed to determine paths via import.meta.url:', e);
    currentFilename = process.cwd() + '/unknown-file.js';
    currentDirname = process.cwd();
  }
} else {
  console.warn('Could not determine file paths via Jest or import.meta.url. Using module.filename fallback.');
  if (typeof module !== 'undefined' && typeof module.filename !== 'undefined') {
    currentFilename = module.filename;
    currentDirname = path.dirname(currentFilename);
  } else {
      currentFilename = process.cwd() + '/ultimate-fallback.js';
      currentDirname = process.cwd();
  }
}

// Cors
app.use(cors({
  origin: process.env.CLIENT || 'http://localhost:3000',
  credentials: true,
}));

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(currentDirname, 'public')));
// app.use(i18nMiddleware);

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
import adminRoutes from './routes/admin.js';
// import deviceTriggerRoutes from './routes/deviceTrigger.js';

// Використання маршрутів
// front
app.use('/', indexRoutes);           // Головна сторінка
app.use('/', statusRoutes);          // Сторінка статусу
app.use('/', signUpRoutes);          // Сторінка sign upa
app.use('/admin', adminRoutes);      // Сторінка адміна

// api
app.use('/api/telegram', telegramRoutes);
app.use('/api/auth', authRoutes); // маршрути для реєстрації та логіну
app.use('/api/users', usersRoutes); 
app.use('/api/devices', deviceRoutes); // маршрути для керування пристроєм
app.use('/api/triggers', triggerRoutes);

// Налаштування WebSocket-з'єднань
io.on('connection', (socket) => {
  console.log(t('ws_connection', {socket_id: socket.id}));

  socket.on('disconnect', () => {
    console.log(t('ws_disconnected', {socket_id: socket.id}));
  });
});

// Запуск сервера
server.listen(PORT, async () => {
  console.log(t('server_started', { port: PORT }));
  if (process.env.NODE_ENV !== 'test' || typeof process.env.JEST_WORKER_ID === 'undefined') {
    const serverInitTimer = setTimeout(async () => {
      io.emit('serverStarted', { message: t('server_io_message') });
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
          await initializeClient(admin._id);
      } else {
          console.error(t('user.errors.admin_not_found'));
      }
      if (serverInitTimer && typeof serverInitTimer.unref === 'function') {
          serverInitTimer.unref();
      }
    }, 3000);
  } else {
      console.log(`Server listen callback logic skipped in test environment. Port: ${PORT}`);
  }

});

export default app;
export { server };
