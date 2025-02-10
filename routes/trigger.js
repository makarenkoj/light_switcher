import express from 'express';
import { show, index, update, create, remove } from '../controllers/triggerController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:id', authenticateUser, show);
router.get('/', authenticateUser, index);
router.post('/', authenticateUser, create);
router.put('/:id', authenticateUser, update);
router.delete('/:id', authenticateUser, remove);

export default router;
