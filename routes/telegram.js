const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegramController');
const authenticateUser = require('../middleware/authMiddleware');

router.post('/sendCode', authenticateUser, telegramController.sendCode);
router.post('/signIn', authenticateUser, telegramController.signIn);
router.get('/checkSession', authenticateUser, telegramController.checkSession);

module.exports = router;
