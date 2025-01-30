import express from 'express';
import { changeStatus, getStatus, create } from '../controllers/deviceController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/changeStatus', authenticateUser, changeStatus);
router.get('/getStatus', authenticateUser, getStatus);
router.post('/', authenticateUser, create);
export default router;
