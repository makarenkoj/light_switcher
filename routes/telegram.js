import express from 'express';
import { sendCode, signIn, checkSession, show, create, update, remove } from '../controllers/telegramController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/sendCode', authenticateUser, sendCode);
router.post('/signIn', authenticateUser, signIn);
router.get('/checkSession', authenticateUser, checkSession);

router.get('/', authenticateUser, show);
router.post('/', authenticateUser, create);
router.put('/', authenticateUser, update);
router.delete('/', authenticateUser, remove);

export default router;
