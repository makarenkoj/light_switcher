const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');
const authenticateUser = require('../middleware/authMiddleware');

// router.get('/', authenticateUser, indexController.getIndex);
router.get('/', indexController.getIndex);

module.exports = router;
