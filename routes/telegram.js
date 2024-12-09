const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegramController');

router.post('/sendCode', telegramController.sendCode);
router.post('/signIn', telegramController.signIn);
router.get('/checkSession', telegramController.checkSession);

module.exports = router;
