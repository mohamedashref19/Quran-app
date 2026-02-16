const express = require("express");
const prayerController = require("../controllers/prayerController");

const router = express.Router();

router.get("/", prayerController.getPrayerTimes);
router.get("/get-location", prayerController.getLocation);  
module.exports = router;