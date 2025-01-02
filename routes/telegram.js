import express from 'express';
import { sendCode, signIn, checkSession } from '../controllers/telegramController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/sendCode', authenticateUser, sendCode);
router.post('/signIn', authenticateUser, signIn);
router.get('/checkSession', authenticateUser, checkSession);

export default router;
