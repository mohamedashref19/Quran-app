const express = require("express");
const prayerController = require("../controllers/prayerController");

const router = express.Router();

router.get("/", prayerController.getPrayerTimes);

module.exports = router;