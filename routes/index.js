import express from 'express';
import { getIndex } from '../controllers/indexController.js';
// import authenticateUser from '../middleware/authMiddleware.js';

const router = express.Router();

// router.get('/', authenticateUser, indexController.getIndex);
router.get('/', getIndex);

export default router;
