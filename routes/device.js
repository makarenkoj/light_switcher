import express from 'express';
import { changeStatus, getStatus, show, index, update, create, remove } from '../controllers/deviceController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/changeStatus', authenticateUser, changeStatus);
router.get('/getStatus', authenticateUser, getStatus);
router.get('/:id', authenticateUser, show);
router.get('/', authenticateUser, index);
router.post('/', authenticateUser, create);
router.put('/:id', authenticateUser, update);
router.delete('/:id', authenticateUser, remove);
export default router;
