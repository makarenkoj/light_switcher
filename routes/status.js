const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');

// Сторінка статусу
router.get('/status', statusController.getStatus);

module.exports = router;