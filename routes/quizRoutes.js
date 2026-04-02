const express = require('express');
const quizControllers = require('../controllers/quizControllers');
const authControllers = require('../controllers/authControllers');

const router = express.Router();

router.get('/today', quizControllers.getTodayQuiz);

router.use(authControllers.proctect); 
router.use(authControllers.restrictTO('admin'));

router.post('/bank', quizControllers.addToBank);
router.get('/bank/stats', quizControllers.getBankStats);
router.get('/bank', quizControllers.getAllBank);
router.patch('/bank/:id', quizControllers.updateBankQuestion);
router.delete('/bank/:id', quizControllers.deleteBankQuestion);

module.exports = router;