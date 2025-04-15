import express  from 'express';
import { register, login, logout } from '../controllers/adminController.js';
import { authenticateUser, adminMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticateUser, adminMiddleware, logout);

export default router;
