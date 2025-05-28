import express  from 'express';
import { index, show, create, update, remove } from '../controllers/indicatorController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateUser, index);
// router.get('/', authenticateUser, show);
router.post('/', authenticateUser, create);
router.put('/:id', authenticateUser, update);
router.delete('/:id', authenticateUser, remove);

export default router;
