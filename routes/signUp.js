import express  from 'express';
import { getSignUpPage, getLoginPage } from '../controllers/signUpController.js';

const router = express.Router();

router.get('/sign_up', getSignUpPage);
router.get('/login', getLoginPage )

export default router;
