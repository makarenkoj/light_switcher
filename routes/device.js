import express from 'express';
import { changeStatus, getStatus } from '../controllers/deviceController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/changeStatus', authenticateUser, changeStatus);
router.get('/getStatus', authenticateUser, getStatus);
export default router;
