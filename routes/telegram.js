import express from 'express';
import { sendCode, signIn, checkSession, show, create, update, remove } from '../controllers/telegramController.js';
import { authenticateUser, adminMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/sendCode', authenticateUser, adminMiddleware, sendCode);
router.post('/signIn', authenticateUser, adminMiddleware, signIn);
router.get('/checkSession', authenticateUser, checkSession);

router.get('/', authenticateUser, adminMiddleware, show);
router.post('/', authenticateUser, adminMiddleware, create);
router.put('/', authenticateUser, adminMiddleware, update);
router.delete('/', authenticateUser, adminMiddleware, remove);

export default router;
