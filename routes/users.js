import express  from 'express';
import { show, update, remove } from '../controllers/userController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:id', authenticateUser, show);
router.put('/:id', authenticateUser, update);
router.delete('/:id', authenticateUser, remove);

export default router;
