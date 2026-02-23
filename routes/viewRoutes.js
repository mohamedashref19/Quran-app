const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authControllers');

const router = express.Router();

router.use(authController.isLoggedIn);

router.get(
  ['/', '/profile', '/admin', '/khatmah', '/bookmarks', '/live-recitation', '/ai-correction', '/surah-index'], 
  viewsController.getOverview
);

router.get('/login', viewsController.getLoginForm);
router.get('/signup', viewsController.getSignupForm);
router.get('/VerifyOTP', viewsController.getVerifyOTPForm);
router.get('/forgot-password', viewsController.getForgotPasswordForm);
router.get('/resetPassword/:token', viewsController.getResetPasswordForm);

router.get('/me', authController.proctect, viewsController.getAccount);
router.get('/manage-users', authController.proctect, authController.restrictTO("admin"), viewsController.manageUsers);
router.get('/quran', viewsController.getQuran);
router.get('/quran/:number', viewsController.getSurah);
router.get('/prayers', viewsController.getPrayers);
router.get('/reciters', viewsController.getReciters);
router.get('/check-recitation', authController.proctect, viewsController.getRecitationCheck);
router.get('/stream-check', authController.proctect, viewsController.getAutomaticTracker);
router.get('/my-khatmah', authController.proctect, viewsController.getKhatmah);
router.get('/my-bookmarks', authController.proctect, viewsController.getBookmarks);

module.exports = router;