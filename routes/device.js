import express from 'express';
import { changeStatus, getStatus, show, index, update, create, remove, triggers } from '../controllers/deviceController.js';
import { createDeviceTrigger } from '../controllers/deviceTriggerController.js';
import authenticateUser from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/status/:id', authenticateUser, changeStatus);
router.get('/status/:id', authenticateUser, getStatus);
router.get('/:id', authenticateUser, show);
router.get('/', authenticateUser, index);
router.post('/', authenticateUser, create);
router.put('/:id', authenticateUser, update);
router.delete('/:id', authenticateUser, remove);
router.get('/:id/triggers', authenticateUser, triggers);
router.post('/:id/triggers', authenticateUser, createDeviceTrigger);

export default router;
