const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const authenticateUser = require('../middleware/authMiddleware');

// Сторінка статусу
// router.get('/status', authenticateUser, statusController.getStatus);
router.get('/status', statusController.getStatus);

module.exports = router;