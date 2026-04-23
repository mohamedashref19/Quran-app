const express = require('express');
const notificationController = require('../controllers/notificationController');
const authControllers = require('../controllers/authControllers'); 
const router = express.Router();

router.post('/save-token', notificationController.saveToken);

router.use(authControllers.proctect); 
router.use(authControllers.restrictTO('admin'));
router.post('/send-global', notificationController.sendGlobalNotification);

module.exports = router;