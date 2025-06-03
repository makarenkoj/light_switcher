import express  from 'express';
import { show, update, remove, getTriggers } from '../controllers/userController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/triggers', authenticateUser, getTriggers);
router.get('/:id', authenticateUser, show);
router.put('/:id', authenticateUser, update);
router.delete('/:id', authenticateUser, remove);

export default router;
