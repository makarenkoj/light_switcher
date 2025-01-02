import express  from 'express';
import { getStatus } from '../controllers/statusController.js';
// import authenticateUser from '../middleware/authMiddleware';

const router = express.Router();

// Сторінка статусу
// router.get('/status', authenticateUser, statusController.getStatus);
router.get('/status', getStatus);

export default router;
