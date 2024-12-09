const express = require('express');
const router = express.Router();
const indexController = require('../controllers/signUpController');

router.get('/sign_up', indexController.getSignUpPage);
router.get('/login', indexController.getLoginPage )

module.exports = router;
